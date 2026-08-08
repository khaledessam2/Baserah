import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { InputDirective, LabelDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { LanguageSelector } from '@/components/layout/language-selector/language-selector';
import { ThemeToggle } from '@/components/layout/theme-toggle/theme-toggle';
import { STEP_PATHS } from '@/components/layout/global-wizard/global-wizard';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `pages/AuthPage.tsx`. */
@Component({
  selector: 'app-auth-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonDirective,
    ...CARD_DIRECTIVES,
    InputDirective,
    LabelDirective,
    Icon,
    ThemeToggle,
    LanguageSelector,
    TranslatePipe,
  ],
  templateUrl: './auth-page.html',
})
export class AuthPage {
  readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  readonly isLogin = signal(true);
  readonly email = signal('');
  readonly password = signal('');
  readonly fullName = signal('');
  readonly isLoading = signal(false);
  readonly error = signal('');

  private readonly destroyRef = inject(DestroyRef);

  private readonly isRtl = computed(() => this.i18n.language() === 'ar');

  fieldClass(extra = ''): string {
    return cn(
      'space-y-1.5',
      extra,
      this.isRtl() ? 'text-right' : 'text-left'
    );
  }

  readonly iconClass = computed(() =>
    cn(
      'absolute top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors',
      this.isRtl() ? 'right-3' : 'left-3'
    )
  );

  readonly inputClass = computed(() =>
    cn(
      'h-11 bg-white/50 dark:bg-slate-950/30 border-gray-200 dark:border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/60',
      this.isRtl() ? 'pr-10' : 'pl-10'
    )
  );

  readonly submitArrowClass = computed(() =>
    cn(
      'w-5 h-5 transition-transform group-hover:translate-x-1',
      this.isRtl() && 'rotate-180'
    )
  );

  handleSubmit(): void {
    this.isLoading.set(true);
    this.error.set('');

    const request$ = this.isLogin()
      ? this.auth.login({
          email: this.email(),
          password: this.password(),
        })
      : this.auth.register({
          email: this.email(),
          password: this.password(),
          full_name: this.fullName(),
        });

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (loggedInUser) => {
        this.isLoading.set(false);

        if (loggedInUser.role === 'employee') {
          this.router.navigate(['/app/employee-dashboard']);
        } else {
          const step = loggedInUser.onboarding_step ?? 0;
          this.router.navigate([STEP_PATHS[step] || '/app/intro']);
        }
      },
      error: (err: any) => {
        console.error(err);
        let msg = err.message || this.i18n.t('errors.generic_error');

        if (err.status === 401) {
          msg = this.i18n.t(
            'auth.username_error',
            'Invalid username or password'
          );
        } else if (err.error) {
          msg =
            err.error.detail || err.error.message || err.error.error || msg;
        }

        this.error.set(msg);
        this.isLoading.set(false);
      },
    });
  }
}
