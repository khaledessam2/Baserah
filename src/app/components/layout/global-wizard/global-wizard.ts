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
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { AuthApi } from '@/services/auth.api';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';

export const STEP_PATHS = [
  '/app/intro',
  '/app/title-generation',
  '/app/job-setup',
  '/app/dashboard',
] as const;

interface WizardStep {
  icon: IconName;
  labelKey: string;
  fallback: string;
}

const STEPS: WizardStep[] = [
  { icon: 'Building', labelKey: 'wizard.intro', fallback: 'Introduction' },
  { icon: 'Wand2', labelKey: 'wizard.title_gen', fallback: 'Title Generation' },
  { icon: 'FileText', labelKey: 'wizard.job_setup', fallback: 'Job Setup' },
  {
    icon: 'LayoutDashboard',
    labelKey: 'wizard.dashboard',
    fallback: 'Dashboard',
  },
];

function pathToIndex(pathname: string): number {
  if (pathname === '/' || pathname === '/app/intro') return 0;
  if (pathname.startsWith('/app/title-generation')) return 1;
  if (pathname.startsWith('/app/job-setup')) return 2;
  if (pathname.startsWith('/app/dashboard')) return 3;
  return -1;
}

/** Port of `layout/GlobalWizard.tsx`. */
@Component({
  selector: 'app-global-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './global-wizard.html',
})
export class GlobalWizard implements OnDestroy {
  readonly steps = STEPS;

  private readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  private readonly pathname = signal(this.router.url.split('?')[0]);
  private readonly routerSub: Subscription;

  readonly maxStepReached = signal(this.auth.user()?.onboarding_step ?? 0);

  readonly currentStepIndex = computed(() => pathToIndex(this.pathname()));

  readonly visible = computed(
    () =>
      this.auth.user()?.role !== 'employee' && this.currentStepIndex() !== -1
  );

  readonly progressWidth = computed(
    () => (this.maxStepReached() / (STEPS.length - 1)) * 100
  );

  constructor() {
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.pathname.set(e.urlAfterRedirects.split('?')[0]));

    // Sync when the user object changes (login/refresh)
    effect(() => {
      this.maxStepReached.set(this.auth.user()?.onboarding_step ?? 0);
    });

    effect(() => {
      const index = this.currentStepIndex();
      if (index === -1) return;
      if (index > this.maxStepReached()) {
        this.maxStepReached.set(index);
        this.persistStep(index);
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub.unsubscribe();
  }

  private persistStep(step: number): void {
    this.authApi
      .updateOnboardingStep(step)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          // non-critical — local state already updated
        },
      });
  }

  isActive(index: number): boolean {
    return index === this.currentStepIndex();
  }

  isCompleted(index: number): boolean {
    return index < this.currentStepIndex();
  }

  isPast(index: number): boolean {
    return index <= this.maxStepReached();
  }

  onStepClick(index: number): void {
    if (this.isPast(index)) this.router.navigate([STEP_PATHS[index]]);
  }

  markerClass(index: number): string {
    if (this.isActive(index)) {
      return 'bg-card text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] scale-110 ring-4 ring-primary/5';
    }
    if (this.isCompleted(index)) {
      return 'bg-linear-to-br from-primary to-secondary text-primary-foreground shadow-md shadow-primary/20';
    }
    if (this.isPast(index)) {
      return 'bg-card border-2 border-primary/20 text-primary/30 hover:border-primary/30 hover:text-primary/40';
    }
    return 'bg-card text-muted-foreground/30 border-2 border-border';
  }

  labelClass(index: number): string {
    if (this.isActive(index)) return 'text-primary translate-y-0 opacity-100';
    return this.isCompleted(index) ? 'text-primary/80' : 'text-muted-foreground';
  }
}
