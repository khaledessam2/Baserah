import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '@/services/i18n.service';
import { AssessmentService } from '@/services/assessment.service';
import type { DetailedAnswer, DetailedAssessmentResult } from '@/models/api.model';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

type StatColor = 'primary' | 'green' | 'red' | 'amber';

const STAT_COLORS: Record<StatColor, string> = {
  primary:
    'from-primary to-secondary text-primary bg-primary/10 shadow-primary/10',
  green:
    'from-emerald-500 to-teal-600 text-emerald-600 bg-emerald-500/10 shadow-emerald-500/10',
  red: 'from-rose-500 to-red-600 text-rose-600 bg-rose-500/10 shadow-rose-500/10',
  amber:
    'from-amber-400 to-orange-500 text-amber-600 bg-amber-500/10 shadow-amber-500/10',
};

/** Port of `pages/AssessmentResultsPage.tsx`. */
@Component({
  selector: 'app-assessment-results-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, ...CARD_DIRECTIVES, Icon, TranslatePipe],
  templateUrl: './assessment-results-page.html',
})
export class AssessmentResultsPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly i18n = inject(I18nService);
  private readonly assessmentService = inject(AssessmentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly results = signal<DetailedAssessmentResult | null>(null);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    const assessmentId = this.route.snapshot.queryParamMap.get('id');
    if (!assessmentId) {
      this.router.navigate(['/app/employee-dashboard']);
      return;
    }
    this.fetchResults(assessmentId);
  }

  private fetchResults(assessmentId: string): void {
    this.assessmentService
      .getAssessmentResults(assessmentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.results.set(response.results);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to fetch assessment results:', error);
          this.isLoading.set(false);
        },
      });
  }

  goBack(): void {
    this.location.back();
  }

  readonly isTechnical = computed(
    () => this.results()?.assessment_type === 'technical'
  );

  readonly statCards = computed<
    { label: string; value: string | number; icon: IconName; color: StatColor }[]
  >(() => {
    const res = this.results();
    if (!res) return [];
    const t = (key: string) => this.i18n.t(key);
    return [
      {
        label: t('assessment_results.final_score'),
        value: `${res.score ?? 0}%`,
        icon: 'Trophy',
        color: 'primary',
      },
      {
        label: t('assessment_results.correct_answers'),
        value: res.correct_count ?? 0,
        icon: 'CheckCircle2',
        color: 'green',
      },
      {
        label: t('assessment_results.incorrect_answers'),
        value: res.incorrect_count ?? 0,
        icon: 'XCircle',
        color: 'red',
      },
      {
        label: t('assessment_results.skipped_questions'),
        value: res.skipped_count ?? 0,
        icon: 'HelpCircle',
        color: 'amber',
      },
    ];
  });

  readonly infoItems = computed<
    { icon: IconName; label: string; value: string }[]
  >(() => {
    const res = this.results();
    if (!res) return [];
    const t = (key: string) => this.i18n.t(key);
    return [
      {
        icon: 'User',
        label: t('assessment_results.employee'),
        value: res.employee_name,
      },
      {
        icon: 'Briefcase',
        label: t('assessment_results.job_title'),
        value: res.job_title,
      },
      {
        icon: 'Calendar',
        label: t('assessment_results.submission_date'),
        value: new Date(res.submitted_at).toLocaleDateString(
          this.isRtl() ? 'ar-SA' : 'en-US',
          { dateStyle: 'long' }
        ),
      },
      {
        icon: 'Info',
        label: t('assessment_results.assessment_type'),
        value:
          res.assessment_type === 'technical'
            ? t('assessment_results.technical_type')
            : t('assessment_results.manager_type'),
      },
    ];
  });

  isSelected(answer: DetailedAnswer, idx: number): boolean {
    return idx === answer.selected_option_index;
  }

  isCorrect(answer: DetailedAnswer, idx: number): boolean {
    return this.isTechnical() && idx === answer.correct_answer_index;
  }

  isWrong(answer: DetailedAnswer, idx: number): boolean {
    return (
      this.isTechnical() &&
      this.isSelected(answer, idx) &&
      !this.isCorrect(answer, idx)
    );
  }

  statIconClass(color: StatColor): string {
    return cn('p-4 rounded-2xl shadow-lg shadow-opacity-20', STAT_COLORS[color]);
  }

  optionClass(answer: DetailedAnswer, idx: number): string {
    const selected = this.isSelected(answer, idx);
    const correct = this.isCorrect(answer, idx);
    const wrong = this.isWrong(answer, idx);
    return cn(
      'p-4 rounded-xl border-2 transition-all flex items-center justify-between',
      selected && !wrong && !correct && 'bg-primary/5 border-primary/20 text-primary',
      correct &&
        'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 shadow-sm',
      wrong && 'bg-rose-500/10 border-rose-500/50 text-rose-600',
      !selected && !correct && 'bg-muted/30 border-border text-muted-foreground'
    );
  }

  feedbackClass(answer: DetailedAnswer): string {
    return cn(
      'p-4 rounded-xl flex items-center gap-3 text-sm font-bold',
      answer.is_correct
        ? 'bg-emerald-500/10 text-emerald-600'
        : 'bg-rose-500/10 text-rose-500'
    );
  }
}
