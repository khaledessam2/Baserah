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
import { FormsModule } from '@angular/forms';
import { I18nService } from '@/services/i18n.service';
import { ToastService } from '@/services/toast.service';
import { EmployeeService } from '@/services/employee.service';
import type { Employee } from '@/models/employee.model';
import { ButtonDirective } from '@/shared/directives/button.directive';
import {
  Dialog,
  DialogHeaderDirective,
  DialogTitleDirective,
} from '@/shared/components/dialog';
import { InputDirective, LabelDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `dashboard/AddEmployeeModal.tsx`. */
@Component({
  selector: 'app-add-employee-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    Dialog,
    DialogHeaderDirective,
    DialogTitleDirective,
    ButtonDirective,
    InputDirective,
    LabelDirective,
    Icon,
    TranslatePipe,
  ],
  templateUrl: './add-employee-modal.html',
})
export class AddEmployeeModal {
  readonly isOpen = input(false);
  readonly organizationName = input.required<string>();
  readonly userId = input<string | undefined>(undefined);
  readonly employees = input<Employee[]>([]);

  readonly closed = output<void>();
  readonly succeeded = output<void>();

  private readonly i18n = inject(I18nService);
  private readonly toastService = inject(ToastService);
  private readonly employeeService = inject(EmployeeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly nationalId = signal('');
  readonly fullName = signal('');
  readonly jobTitle = signal('');
  readonly department = signal('');
  readonly email = signal('');
  readonly section = signal('');
  readonly managerId = signal('');
  readonly password = signal('');

  readonly isLoading = signal(false);

  private readonly isRtl = computed(() => this.i18n.language() === 'ar');

  // Crosses a component boundary as `[contentClass]`, so this stays a string
  // rather than a class binding on an element.
  readonly contentClass = computed(() =>
    this.isRtl() ? 'sm:max-w-[500px] rtl' : 'sm:max-w-[500px]'
  );

  handleSubmit(): void {
    const toast = (message: string, type: 'success' | 'error') =>
      this.toastService.toast(message, type);

    if (
      !this.nationalId() ||
      !this.fullName() ||
      !this.jobTitle() ||
      !this.department()
    ) {
      toast(
        this.i18n.t('common.required_fields_error', 'Required fields missing'),
        'error'
      );
      return;
    }

    this.isLoading.set(true);

    // Find selected manager details
    const selectedManager = this.employees().find(
      (emp) =>
        emp.national_id === this.managerId() ||
        emp.الهوية_الوطنية === this.managerId()
    );

    // Map to format backend expects
    const employeeData = {
      الهوية_الوطنية: this.nationalId(),
      national_id: this.nationalId(),
      اسم_الموظف: this.fullName(),
      full_name: this.fullName(),
      المسمى_الوظيفي: this.jobTitle(),
      job_title: this.jobTitle(),
      الإدارة_التابع_لها_الموظف: this.department(),
      department: this.department(),
      email: this.email(),
      القسم: this.section() || this.department(),
      password: this.password(),
      // Manager details
      manager_national_id: this.managerId(),
      manager_id: this.managerId(), // Duplicate for safety
      اسم_المدير_المباشر:
        selectedManager?.اسم_الموظف || selectedManager?.full_name || '',
      manager_name:
        selectedManager?.اسم_الموظف || selectedManager?.full_name || '',
      المسمى_الوظيفي_للمدير_المباشر:
        selectedManager?.المسمى_الوظيفي || selectedManager?.job_title || '',
      manager_job_title:
        selectedManager?.المسمى_الوظيفي || selectedManager?.job_title || '',
    };

    this.employeeService
      .addEmployee(
        this.organizationName(),
        employeeData as Partial<Employee>,
        this.userId()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.isLoading.set(false);

          if (result.success) {
            toast(
              this.i18n.t(
                'employees_page.messages.add_success',
                'Employee added successfully'
              ),
              'success'
            );
            this.succeeded.emit();
            this.closed.emit();
            // Reset form
            this.nationalId.set('');
            this.fullName.set('');
            this.jobTitle.set('');
            this.department.set('');
            this.email.set('');
            this.section.set('');
            this.managerId.set('');
            this.password.set('');
          } else {
            toast(result.message || 'Failed to add employee', 'error');
          }
        },
        error: (error) => {
          console.error(error);
          toast('An unexpected error occurred', 'error');
          this.isLoading.set(false);
        },
      });
  }
}
