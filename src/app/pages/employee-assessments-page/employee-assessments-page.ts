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
import { Router } from '@angular/router';
import { EMPTY, finalize, switchMap } from 'rxjs';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { TourService } from '@/services/tour.service';
import { AuthApi } from '@/services/auth.api';
import { AssessmentService } from '@/services/assessment.service';
import type { Assessment } from '@/models/api.model';
import { getTourSteps } from '@/shared/config/tour-config';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

type FilterValue = 'all' | 'technical' | 'manager' | 'pending' | 'completed';

const STAT_COLORS: Record<string, string> = {
  blue: 'border-blue-500 text-blue-600',
  amber: 'border-amber-500 text-amber-600',
  green: 'border-green-500 text-green-600',
  indigo: 'border-indigo-500 text-indigo-600',
};

/** Port of `pages/EmployeeAssessmentsPage.tsx`. */
@Component({
  selector: 'app-employee-assessments-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, ...CARD_DIRECTIVES, Icon, TranslatePipe],
  templateUrl: './employee-assessments-page.html',
})
export class EmployeeAssessmentsPage implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly tour = inject(TourService);
  private readonly authApi = inject(AuthApi);
  private readonly assessmentService = inject(AssessmentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly assessments = signal<Assessment[]>([]);
  readonly isLoading = signal(true);
  readonly filter = signal<FilterValue>('all');

  readonly filterOptions: { value: FilterValue; labelKey: string }[] = [
    { value: 'all', labelKey: 'employee_assessments.all' },
    { value: 'technical', labelKey: 'employee_assessments.technical' },
    { value: 'manager', labelKey: 'employee_assessments.manager' },
    { value: 'pending', labelKey: 'employee_assessments.pending' },
    { value: 'completed', labelKey: 'employee_assessments.completed' },
  ];

  private tourTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      this.auth.user();
      this.fetchData();
    });

    if (!this.tour.hasSeen('employee-assessments')) {
      this.tourTimer = setTimeout(() => {
        this.tour.startTour(
          getTourSteps(this.i18n)['employee-assessments'],
          'employee-assessments'
        );
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.tourTimer) clearTimeout(this.tourTimer);
  }

  private fetchData(): void {
    this.authApi
      .getEmployeeProfile()
      .pipe(
        switchMap((profileRes) =>
          profileRes.success && profileRes.employee
            ? this.assessmentService.getEmployeeAssessments(
                profileRes.employee.رقم_الهوية || this.auth.user()?.email || ''
              )
            : EMPTY
        ),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (assessmentsRes) => {
          if (assessmentsRes.success) {
            this.assessments.set(assessmentsRes.assessments);
          }
        },
        error: (error) =>
          console.error('Failed to fetch assessments data', error),
      });
  }

  readonly stats = computed(() => {
    const assessments = this.assessments();
    return {
      total: assessments.length,
      pending: assessments.filter(
        (a) => a.status === 'pending' || a.status === 'sent'
      ).length,
      completed: assessments.filter((a) => a.status === 'completed').length,
      inProgress: assessments.filter((a) => a.status === 'in_progress').length,
    };
  });

  readonly statCards = computed<
    { label: string; value: number; icon: IconName; color: string }[]
  >(() => {
    const stats = this.stats();
    const t = (key: string) => this.i18n.t(key);
    return [
      {
        label: t('employee_assessments.total_assessments'),
        value: stats.total,
        icon: 'LayoutGrid',
        color: 'blue',
      },
      {
        label: t('employee_assessments.pending'),
        value: stats.pending,
        icon: 'Clock',
        color: 'amber',
      },
      {
        label: t('employee_assessments.completed'),
        value: stats.completed,
        icon: 'CheckCircle2',
        color: 'green',
      },
      {
        label: t('employee_assessments.in_progress'),
        value: stats.inProgress,
        icon: 'Timer',
        color: 'indigo',
      },
    ];
  });

  readonly filteredAssessments = computed(() => {
    const filter = this.filter();
    return this.assessments().filter((a) => {
      if (filter === 'all') return true;
      if (filter === 'technical') return a.assessment_type === 'technical';
      if (filter === 'manager') return a.assessment_type === 'manager';
      if (filter === 'pending')
        return a.status === 'pending' || a.status === 'sent';
      if (filter === 'completed') return a.status === 'completed';
      return true;
    });
  });

  isTechnical(assessment: Assessment): boolean {
    return assessment.assessment_type === 'technical';
  }

  assessmentDate(assessment: Assessment): string {
    return new Date(
      assessment.created_at ||
        assessment.sent_at ||
        assessment.completed_at ||
        Date.now()
    ).toLocaleDateString('ar-SA');
  }

  takeAssessment(assessment: Assessment): void {
    this.router.navigate(['/app/take-assessment'], {
      queryParams: {
        id: assessment.assessment_id,
        type: assessment.assessment_type,
      },
    });
  }

  viewResults(assessment: Assessment): void {
    this.router.navigate(['/app/assessment-results'], {
      queryParams: { id: assessment.assessment_id },
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'completed':
        return this.i18n.t('employee_assessments.completed');
      case 'sent':
      case 'pending':
        return this.i18n.t('employee_assessments.pending');
      case 'in_progress':
        return this.i18n.t('employee_assessments.in_progress');
      default:
        return status;
    }
  }

  statusBadgeClass(status: string): string {
    const base =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ';
    switch (status) {
      case 'completed':
        return base + 'bg-green-100 text-green-800';
      case 'sent':
      case 'pending':
        return base + 'bg-amber-100 text-amber-800';
      case 'in_progress':
        return base + 'bg-blue-100 text-blue-800';
      default:
        return base + 'bg-gray-100 text-gray-800';
    }
  }

  statCardClass(color: string): string {
    return cn(
      'border-l-4 shadow-sm hover:shadow-md transition-shadow',
      STAT_COLORS[color]
    );
  }

  statIconWrapClass(color: string): string {
    // Kept as the original wrote it — an opacity utility plus a colour class.
    return cn('p-3 rounded-xl bg-opacity-10', `bg-${color}-500`);
  }

  cardBannerClass(assessment: Assessment): string {
    return cn(
      'p-4 flex justify-between items-center text-white',
      this.isTechnical(assessment)
        ? 'bg-gradient-to-r from-blue-600 to-cyan-500'
        : 'bg-gradient-to-r from-indigo-600 to-purple-500'
    );
  }

  filterButtonClass(value: FilterValue): string {
    return cn(
      'px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200',
      this.filter() === value
        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
        : 'bg-muted text-muted-foreground hover:bg-muted/80'
    );
  }

  readonly headerClass = computed(() =>
    cn(
      'bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-2xl shadow-indigo-200/50 animate-in fade-in-0 slide-in-from-top-2 duration-500',
      this.isRtl() ? 'text-right' : 'text-left'
    )
  );

  readonly headerRowClass = computed(() =>
    cn(
      'flex items-center gap-4 sm:gap-6',
      this.isRtl() ? 'flex-row-reverse' : 'flex-row'
    )
  );

  readonly filterBarClass = computed(() =>
    cn(
      'flex flex-col md:flex-row md:items-center justify-between gap-4',
      this.isRtl() ? 'md:flex-row-reverse' : 'md:flex-row'
    )
  );

  readonly filterLabelClass = computed(() =>
    cn(
      'flex items-center gap-2 text-foreground font-bold',
      this.isRtl() ? 'flex-row-reverse' : 'flex-row'
    )
  );

  readonly filterButtonsClass = computed(() =>
    cn('flex flex-wrap gap-2', this.isRtl() ? 'justify-end' : 'justify-start')
  );
}
