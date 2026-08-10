import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { ToastService } from '@/services/toast.service';
import { TourService } from '@/services/tour.service';
import { EmployeeService } from '@/services/employee.service';
import type { Employee, OrganizationStats } from '@/models/employee.model';
import { getTourSteps } from '@/shared/config/tour-config';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { ConfirmationModal } from '@/shared/components/confirmation-modal/confirmation-modal';
import { InputDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { AddEmployeeModal } from '@/components/dashboard/add-employee-modal/add-employee-modal';
import { ChangePasswordModal } from '@/components/dashboard/change-password-modal/change-password-modal';
import { EmployeeDetailModal } from '@/components/dashboard/employee-detail-modal/employee-detail-modal';
import type { ConfirmRequest } from '@/models/employee.model';
import { StatCard } from '@/components/dashboard/stat-card/stat-card';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `pages/EmployeesPage.tsx`. */
@Component({
  selector: 'app-employees-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonDirective,
    ...CARD_DIRECTIVES,
    InputDirective,
    Icon,
    StatCard,
    ConfirmationModal,
    AddEmployeeModal,
    ChangePasswordModal,
    EmployeeDetailModal,
    TranslatePipe,
  ],
  templateUrl: './employees-page.html',
})
export class EmployeesPage implements OnDestroy {
  readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly toastService = inject(ToastService);
  private readonly tour = inject(TourService);
  private readonly employeeService = inject(EmployeeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly employees = signal<Employee[]>([]);
  readonly stats = signal<OrganizationStats>({
    total_employees: 0,
    active_employees: 0,
    departments_count: 0,
    job_titles_count: 0,
  });
  readonly isLoading = signal(true);
  readonly searchTerm = signal('');
  readonly selectedEmployee = signal<Employee | null>(null);
  readonly isModalOpen = signal(false);
  readonly isAddEmployeeModalOpen = signal(false);

  // Password Reset State
  readonly resetParam = signal<{ isOpen: boolean; emp: Employee | null }>({
    isOpen: false,
    emp: null,
  });

  // Confirmation modal state
  readonly confirmModal = signal<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    confirmText?: string;
    variant?: 'danger' | 'default';
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  readonly organizationName = computed(
    () =>
      this.auth.user()?.organization_name ||
      localStorage.getItem('companyName') ||
      ''
  );

  private tourTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      this.organizationName();
      this.loadData();
    });

    effect(() => {
      if (
        !this.tour.hasSeen('employees') &&
        this.employees().length > 0 &&
        !this.isLoading()
      ) {
        this.tourTimer = setTimeout(() => this.startTour(), 1500);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.tourTimer) clearTimeout(this.tourTimer);
  }

  startTour(): void {
    this.tour.startTour(getTourSteps(this.i18n)['employees'], 'employees');
  }

  loadData(): void {
    const organizationName = this.organizationName();
    if (!organizationName) {
      // No organization to query — drop the spinner so the empty state shows
      // instead of loading forever.
      this.employees.set([]);
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    this.employeeService
      .getEmployees(organizationName, this.auth.user()?.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result.success) {
          this.employees.set(result.employees);
          this.stats.set(result.stats);
        }
        this.isLoading.set(false);
      });
  }

  rowKey(emp: Employee): string {
    return (
      (emp as any)._id ||
      (emp as any).id ||
      emp.الهوية_الوطنية ||
      emp.national_id
    );
  }

  openDetails(emp: Employee): void {
    this.selectedEmployee.set(emp);
    this.isModalOpen.set(true);
  }

  openPasswordReset(emp: Employee): void {
    this.resetParam.set({ isOpen: true, emp });
  }

  openConfirm(request: ConfirmRequest): void {
    this.confirmModal.set({ isOpen: true, ...request });
  }

  closeConfirm(): void {
    this.confirmModal.update((prev) => ({ ...prev, isOpen: false }));
  }

  handleDelete(nationalId: string): void {
    this.openConfirm({
      title: this.i18n.t('employees_page.confirm.delete_title'),
      description: this.i18n.t('employees_page.confirm.delete_description'),
      variant: 'danger',
      confirmText: this.i18n.t('employees_page.confirm.delete_button'),
      onConfirm: () => {
        this.employeeService
          .deleteEmployee(
            this.organizationName(),
            nationalId,
            this.auth.user()?.id
          )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((result) => {
            if (result.success) {
              this.toastService.toast(
                this.i18n.t('employees_page.messages.delete_success'),
                'success'
              );
              this.loadData();
            } else {
              this.toastService.toast(
                this.i18n.t('employees_page.messages.delete_failed'),
                'error'
              );
            }
          });
      },
    });
  }

  readonly filteredEmployees = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.employees().filter(
      (emp) =>
        emp.اسم_الموظف.toLowerCase().includes(term) ||
        emp.المسمى_الوظيفي.toLowerCase().includes(term) ||
        emp.الهوية_الوطنية.includes(this.searchTerm())
    );
  });

  exportToCSV(): void {
    const filteredEmployees = this.filteredEmployees();
    if (filteredEmployees.length === 0) {
      this.toastService.toast(
        this.i18n.t('employees_page.messages.no_export_data'),
        'error'
      );
      return;
    }

    const t = (key: string) => this.i18n.t(key);

    const headers = [
      t('employees_page.csv_headers.name'),
      t('employees_page.csv_headers.national_id'),
      t('employees_page.csv_headers.job_title'),
      t('employees_page.csv_headers.department'),
      t('employees_page.csv_headers.section'),
      t('employees_page.csv_headers.email'),
      t('employees_page.csv_headers.status'),
    ];

    const rows = filteredEmployees.map((emp) => [
      emp.اسم_الموظف || '',
      emp.الهوية_الوطنية || '',
      emp.المسمى_الوظيفي || '',
      emp.الإدارة_التابع_لها_الموظف || '',
      emp.القسم || '',
      emp.email || '',
      emp.status === 'inactive'
        ? t('employees_page.csv_headers.inactive')
        : t('employees_page.csv_headers.active'),
    ]);

    let csv = '﻿' + headers.join(',') + '\n';
    rows.forEach((row) => {
      csv += row.map((cell) => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `employees_${this.organizationName()}_${
        new Date().toISOString().split('T')[0]
      }.csv`
    );
    link.click();
    URL.revokeObjectURL(url);
  }

}
