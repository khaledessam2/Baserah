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
import { Router } from '@angular/router';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { TourService } from '@/services/tour.service';
import { DashboardService } from '@/services/dashboard.service';
import type { JobTitleData } from '@/models/dashboard.model';
import { getTourSteps } from '@/shared/config/tour-config';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { InputDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { SELECT_DIRECTIVES } from '@/shared/components/select';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `pages/JobTitlesPage.tsx`. */
@Component({
  selector: 'app-job-titles-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonDirective,
    ...CARD_DIRECTIVES,
    InputDirective,
    Icon,
    ...SELECT_DIRECTIVES,
    TranslatePipe,
  ],
  templateUrl: './job-titles-page.html',
})
export class JobTitlesPage implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly tour = inject(TourService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly loading = signal(true);
  readonly jobTitles = signal<JobTitleData[]>([]);
  readonly stats = signal({ total: 0, complete: 0, jdOnly: 0, noJd: 0 });
  readonly searchTerm = signal('');
  readonly statusFilter = signal('all');
  readonly orgFilter = signal('all');

  readonly organizationName = computed(
    () =>
      this.auth.user()?.organization_name ||
      localStorage.getItem('companyName') ||
      ''
  );

  private tourTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      this.auth.user()?.id;
      this.organizationName();
      this.loadData();
    });

    // Auto-start tour if not seen before
    if (!this.tour.hasSeen('job-titles')) {
      this.tourTimer = setTimeout(() => {
        this.tour.startTour(getTourSteps(this.i18n)['job-titles'], 'job-titles');
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.tourTimer) clearTimeout(this.tourTimer);
  }

  loadData(): void {
    const userId = this.auth.user()?.id;
    if (!userId) {
      // Nothing to query without a user — drop the spinner so the empty state
      // shows instead of loading forever.
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.dashboardService
      .getJobTitlesDashboard(userId, this.organizationName())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.jobTitles.set(response.data.job_titles);
            const breakdown = response.data.status_breakdown;
            this.stats.set({
              total:
                breakdown.no_jd +
                breakdown.jd_only +
                breakdown.jd_and_competencies,
              complete: breakdown.jd_and_competencies,
              jdOnly: breakdown.jd_only,
              noJd: breakdown.no_jd,
            });
          }
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Failed to load dashboard data:', error);
          this.loading.set(false);
        },
      });
  }

  readonly filteredJobTitles = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.jobTitles().filter((title) => {
      const matchesSearch = title.title.toLowerCase().includes(term);
      const matchesStatus =
        this.statusFilter() === 'all' || title.status === this.statusFilter();
      const matchesOrg =
        this.orgFilter() === 'all' || title.organization === this.orgFilter();
      return matchesSearch && matchesStatus && matchesOrg;
    });
  });

  readonly organizations = computed(() =>
    Array.from(
      new Set(this.jobTitles().map((jt) => jt.organization).filter(Boolean))
    )
  );

  private statusInfo(status: string): { label: string; color: string } {
    switch (status) {
      case 'jd_and_competencies':
        return {
          label: this.i18n.t(
            'job_titles_page.status_labels.jd_and_competencies'
          ),
          color:
            'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
        };
      case 'jd_only':
        return {
          label: this.i18n.t('job_titles_page.status_labels.jd_only'),
          color:
            'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
        };
      case 'no_jd':
        return {
          label: this.i18n.t('job_titles_page.status_labels.no_jd'),
          color:
            'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
        };
      default:
        return {
          label: this.i18n.t('job_titles_page.status_labels.unknown'),
          color: 'bg-muted text-muted-foreground border-border',
        };
    }
  }

  statusLabel(status: string): string {
    return this.statusInfo(status).label;
  }

  statusBadgeClass(status: string): string {
    return `px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
      this.statusInfo(status).color
    }`;
  }

  checkCircleClass(active: boolean): string {
    return `w-9 h-9 rounded-full flex items-center justify-center transition-all ${
      active
        ? 'bg-emerald-100 text-emerald-600 shadow-sm dark:bg-emerald-500/10 dark:text-emerald-400'
        : 'bg-muted text-muted-foreground dark:bg-slate-800/50'
    }`;
  }

  openCompetencies(jobTitle: string): void {
    this.router.navigate(['/app/job-title-competencies'], {
      queryParams: { jobTitle },
    });
  }

  readonly rootClass = computed(() =>
    cn(
      'container mx-auto px-4 py-8 min-h-screen transition-all duration-300',
      this.isRtl() ? 'rtl' : 'ltr'
    )
  );

  readonly refreshIconClass = computed(
    () => `w-4 h-4 ${this.loading() ? 'animate-spin' : ''}`
  );

  readonly tableClass = computed(() =>
    cn('w-full border-collapse', this.isRtl() ? 'text-right' : 'text-left')
  );

  readonly chevronCellClass = computed(() =>
    cn('px-6 py-5', this.isRtl() ? 'text-right' : 'text-left')
  );
}
