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
import type { Observable } from 'rxjs';
import { I18nService } from '@/services/i18n.service';
import { ToastService } from '@/services/toast.service';
import { AuthApi } from '@/services/auth.api';
import { ButtonDirective } from '@/shared/directives/button.directive';
import {
  Dialog,
  DialogHeaderDirective,
  DialogTitleDirective,
} from '@/shared/components/dialog';
import { InputDirective, LabelDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `dashboard/ChangePasswordModal.tsx`. */
@Component({
  selector: 'app-change-password-modal',
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
  templateUrl: './change-password-modal.html',
})
export class ChangePasswordModal {
  readonly isOpen = input(false);
  readonly mode = input.required<'self' | 'admin_reset'>();
  /** Required for admin_reset */
  readonly userId = input<string | undefined>(undefined);
  /** Optional context for admin reset title */
  readonly userName = input<string | undefined>(undefined);

  readonly closed = output<void>();

  private readonly i18n = inject(I18nService);
  private readonly toastService = inject(ToastService);
  private readonly authApi = inject(AuthApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly isLoading = signal(false);

  private readonly isRtl = computed(() => this.i18n.language() === 'ar');

  // Crosses a component boundary as `[contentClass]`, so this stays a string
  // rather than a class binding on an element.
  readonly contentClass = computed(() =>
    this.isRtl() ? 'sm:max-w-[400px] rtl' : 'sm:max-w-[400px]'
  );

  readonly heading = computed(() =>
    this.mode() === 'self'
      ? this.i18n.t('auth.change_password', 'Change Password')
      : `${this.i18n.t('auth.reset_password', 'Reset Password')}: ${
          this.userName() || ''
        }`
  );

  handleSubmit(): void {
    const toast = (message: string, type: 'success' | 'error') =>
      this.toastService.toast(message, type);

    if (this.newPassword() !== this.confirmPassword()) {
      toast(this.i18n.t('common.password_mismatch', 'Passwords do not match'), 'error');
      return;
    }

    if (this.newPassword().length < 6) {
      toast(
        this.i18n.t(
          'common.password_length_error',
          'Password must be at least 6 characters'
        ),
        'error'
      );
      return;
    }

    let request$: Observable<{ success?: boolean; message?: string }>;
    if (this.mode() === 'self') {
      request$ = this.authApi.changePassword(
        this.currentPassword(),
        this.newPassword()
      );
    } else {
      const userId = this.userId();
      if (!userId) {
        toast('User ID missing for reset', 'error');
        return;
      }
      request$ = this.authApi.resetPassword(userId, this.newPassword());
    }

    this.isLoading.set(true);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.isLoading.set(false);

        if (result.success) {
          toast(
            this.i18n.t(
              'common.password_update_success',
              'Password updated successfully'
            ),
            'success'
          );
          this.closed.emit();
          this.currentPassword.set('');
          this.newPassword.set('');
          this.confirmPassword.set('');
        } else {
          toast(result.message || 'Failed to update password', 'error');
        }
      },
      error: (error: any) => {
        console.error(error);
        toast(error.error?.detail || 'An error occurred', 'error');
        this.isLoading.set(false);
      },
    });
  }
}
