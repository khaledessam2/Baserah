import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@/services/i18n.service';
import { ToastService } from '@/services/toast.service';
import { EmployeeService } from '@/services/employee.service';
import type { Employee } from '@/models/employee.model';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { Icon } from '@/shared/components/icon/icon';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';
import type { ConfirmRequest } from '@/models/employee.model';

interface DetailRow {
  label: string;
  value: string;
}

/** Port of the `EmployeeDetailModal` helper in `pages/EmployeesPage.tsx`. */
@Component({
  selector: 'app-employee-detail-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, Icon, TranslatePipe],
  templateUrl: './employee-detail-modal.html',
})
export class EmployeeDetailModal {
  readonly employee = input.required<Employee>();
  readonly employees = input.required<Employee[]>();
  readonly organizationName = input.required<string>();

  readonly closed = output<void>();
  readonly confirmRequested = output<ConfirmRequest>();

  private readonly i18n = inject(I18nService);
  private readonly toastService = inject(ToastService);
  private readonly employeeService = inject(EmployeeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isSending = signal<string | null>(null);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');


  // ✨ Find manager record to show "real" name if possible
  private readonly managerId = computed(
    () =>
      this.employee().رقم_الهوية_الوطنية_للمدير_المباشر ||
      this.employee().manager_national_id
  );

  private readonly managerRecord = computed(() => {
    const managerId = this.managerId();
    return managerId
      ? this.employees().find(
          (m) =>
            (m.الهوية_الوطنية || m.national_id || '').toString() ===
            managerId.toString()
        )
      : null;
  });

  readonly detailRows = computed<DetailRow[]>(() => {
    const emp = this.employee();
    const t = (key: string) => this.i18n.t(key);
    const notSpecified = t('employees_page.modal.not_specified');

    const managerName =
      this.managerRecord()?.اسم_الموظف ||
      emp.اسم_المدير_المباشر ||
      notSpecified;

    return [
      {
        label: t('employees_page.modal.full_name'),
        value: emp.اسم_الموظف || emp.full_name || '',
      },
      {
        label: t('employees_page.modal.national_id'),
        value: emp.الهوية_الوطنية || emp.national_id || '',
      },
      {
        label: t('employees_page.modal.job_title'),
        value: emp.المسمى_الوظيفي || emp.job_title || '',
      },
      {
        label: t('employees_page.modal.department'),
        value:
          emp.الإدارة_التابع_لها_الموظف ||
          emp.department ||
          emp.القسم ||
          emp.section ||
          '',
      },
      {
        label: t('employees_page.modal.grade'),
        value: emp.المرتبة_الوظيفية || notSpecified,
      },
      {
        label: t('employees_page.modal.location'),
        value: emp.الموقع || notSpecified,
      },
      {
        label: t('employees_page.modal.start_date'),
        value: emp.تاريخ_المباشرة || notSpecified,
      },
      { label: t('employees_page.modal.manager_name'), value: managerName },
      {
        label: t('employees_page.modal.manager_id'),
        value: this.managerId() || notSpecified,
      },
      {
        label: t('employees_page.modal.manager_title'),
        value: emp.المسمى_الوظيفي_للمدير_المباشر || notSpecified,
      },
      {
        label: t('employees_page.modal.email'),
        value: emp.email || notSpecified,
      },
    ];
  });

  private toast(message: string, type: 'success' | 'error'): void {
    this.toastService.toast(message, type);
  }

  handleTechnicalAssessment(): void {
    this.isSending.set('technical');
    this.employeeService
      .sendTechnicalAssessment(this.organizationName(), this.employee())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result.success) {
          this.toast(
            result.message ||
              `✅ ${this.i18n.t('employees_page.messages.technical_success')}`,
            'success'
          );
          this.closed.emit();
        } else {
          this.toast(
            result.message ||
              `❌ ${this.i18n.t('employees_page.messages.technical_failed')}`,
            'error'
          );
        }
        this.isSending.set(null);
      });
  }

  handleManagerAssessment(): void {
    const employee = this.employee();
    const managerId =
      employee.رقم_الهوية_الوطنية_للمدير_المباشر ||
      employee.manager_national_id;
    if (!managerId) {
      this.toast(
        `❌ ${this.i18n.t('employees_page.messages.manager_no_data')}`,
        'error'
      );
      return;
    }

    const manager = this.employees().find(
      (m) => (m.الهوية_الوطنية || m.national_id) === managerId
    );
    if (!manager) {
      this.toast(
        `❌ ${this.i18n.t(
          'employees_page.messages.manager_not_found'
        )} (ID: ${managerId})`,
        'error'
      );
      return;
    }

    this.isSending.set('manager');
    this.employeeService
      .sendManagerAssessment(this.organizationName(), employee, manager)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result.success) {
          this.toast(
            result.message ||
              `✅ ${this.i18n.t('employees_page.messages.manager_success')}`,
            'success'
          );
          this.closed.emit();
        } else {
          this.toast(
            result.message ||
              `❌ ${this.i18n.t('employees_page.messages.manager_failed')}`,
            'error'
          );
        }
        this.isSending.set(null);
      });
  }

  handleTeamAssessment(): void {
    const employee = this.employee();
    const managerId = employee.الهوية_الوطنية || employee.national_id;
    if (!managerId) {
      this.toast(
        `❌ ${this.i18n.t('employees_page.messages.no_employee_id')}`,
        'error'
      );
      return;
    }

    this.confirmRequested.emit({
      title: this.i18n.t('employees_page.confirm.team_title'),
      description: this.i18n.t('employees_page.confirm.team_description'),
      confirmText: this.i18n.t('employees_page.confirm.team_button'),
      onConfirm: () => {
        this.isSending.set('team');
        this.employeeService
          .sendTeamAssessment(managerId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((result) => {
            if (result.success) {
              let msg = `✅ ${this.i18n.t(
                'employees_page.messages.team_success',
                {
                  count: result.newly_assigned ?? 0,
                  total: result.total_team_size ?? 0,
                }
              )}`;
              if (result.skipped_count) {
                msg += `\n${this.i18n.t('employees_page.messages.team_skipped', {
                  count: result.skipped_count,
                })}`;
              }
              this.toast(msg, 'success');
              this.closed.emit();
            } else {
              this.toast(
                result.message ||
                  `❌ ${this.i18n.t('employees_page.messages.team_failed')}`,
                'error'
              );
            }
            this.isSending.set(null);
          });
      },
    });
  }
}
