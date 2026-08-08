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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Location } from '@angular/common';
import { I18nService } from '@/services/i18n.service';
import { ToastService } from '@/services/toast.service';
import { AssessmentService } from '@/services/assessment.service';
import type { Assessment, AssessmentQuestion } from '@/models/api.model';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { ConfirmationModal } from '@/shared/components/confirmation-modal/confirmation-modal';
import { Icon } from '@/shared/components/icon/icon';
import { Progress } from '@/shared/components/progress/progress';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `pages/TakeAssessmentPage.tsx`. */
@Component({
  selector: 'app-take-assessment-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonDirective,
    ...CARD_DIRECTIVES,
    ConfirmationModal,
    Icon,
    Progress,
    TranslatePipe,
  ],
  templateUrl: './take-assessment-page.html',
})
export class TakeAssessmentPage implements OnInit {
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly i18n = inject(I18nService);
  private readonly toastService = inject(ToastService);
  private readonly assessmentService = inject(AssessmentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly round = Math.round;
  readonly likertScale = [1, 2, 3, 4, 5];

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly assessment = signal<Assessment | null>(null);
  readonly currentQuestionIndex = signal(0);
  readonly answers = signal<Record<string, any>>({});
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly showConfirmDialog = signal(false);

  private assessmentId: string | null = null;
  private assessmentType: 'technical' | 'manager' = 'technical';

  // ✨ Check read-only mode
  readonly isReadOnly = computed(
    () => this.assessment()?.status === 'completed'
  );

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.assessmentId = params.get('id');
    this.assessmentType =
      (params.get('type') as 'technical' | 'manager') ?? 'technical';

    if (!this.assessmentId) {
      this.toastService.toast(this.i18n.t('take_assessment.no_id'), 'error');
      this.router.navigate(['/app/employee-dashboard']);
      return;
    }

    this.fetchAssessment(this.assessmentId);
  }

  private fetchAssessment(assessmentId: string): void {
    this.assessmentService
      .getAssessmentById(assessmentId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.assessment) {
            this.assessment.set(response.assessment);
            // ✨ Fill answers if assessment is completed
            if (
              response.assessment.status === 'completed' &&
              response.assessment.answers
            ) {
              this.answers.set(response.assessment.answers);
            }
          } else {
            this.toastService.toast(
              this.i18n.t('take_assessment.load_failed'),
              'error'
            );
          }
        },
        error: (error) => {
          console.error('Failed to fetch assessment', error);
          this.toastService.toast(
            this.i18n.t('take_assessment.load_error'),
            'error'
          );
        },
      });
  }

  readonly questions = computed(() => this.assessment()?.questions || []);
  readonly currentQuestion = computed(
    () => this.questions()[this.currentQuestionIndex()]
  );
  readonly totalQuestions = computed(() => this.questions().length);
  readonly progress = computed(() =>
    this.totalQuestions() > 0
      ? ((this.currentQuestionIndex() + 1) / this.totalQuestions()) * 100
      : 0
  );
  readonly isLastQuestion = computed(
    () => this.currentQuestionIndex() === this.totalQuestions() - 1
  );

  readonly currentQuestionKey = computed(() => {
    const question = this.currentQuestion();
    return question
      ? question.question_id || (this.currentQuestionIndex() + 1).toString()
      : '';
  });

  readonly currentAnswer = computed(
    () => this.answers()[this.currentQuestionKey()]
  );

  readonly hasAnswered = computed(() => {
    const key = this.currentQuestionKey();
    const answers = this.answers();
    return (
      key in answers &&
      answers[key] !== '' &&
      answers[key] !== undefined &&
      answers[key] !== null
    );
  });

  optionsFor(question: AssessmentQuestion): string[] {
    return question.options || (question as any).choices || [];
  }

  handleOptionSelect(optionIndex: number): void {
    if (!this.currentQuestion() || this.isReadOnly()) return; // ✨ Prevent modification
    const key = this.currentQuestionKey();
    this.answers.update((prev) => ({ ...prev, [key]: optionIndex }));
  }

  handleTextChange(text: string): void {
    if (!this.currentQuestion() || this.isReadOnly()) return; // ✨ Prevent modification
    const key = this.currentQuestionKey();
    this.answers.update((prev) => ({ ...prev, [key]: text }));
  }

  handleNext(): void {
    if (!this.hasAnswered() && !this.isReadOnly()) return;
    if (this.currentQuestionIndex() < this.totalQuestions() - 1) {
      this.currentQuestionIndex.update((prev) => prev + 1);
    }
  }

  handlePrev(): void {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update((prev) => prev - 1);
    }
  }

  handlePrimaryAction(): void {
    if (!this.isLastQuestion()) {
      this.handleNext();
      return;
    }
    if (this.isReadOnly()) {
      this.location.back();
      return;
    }
    this.showConfirmDialog.set(true);
  }

  submitAssessment(): void {
    if (!this.assessmentId) return;

    this.isSubmitting.set(true);

    const submit$ =
      this.assessmentType === 'manager'
        ? this.assessmentService.submitManagerAssessment(
            this.assessmentId,
            this.answers(),
            this.questions()
          )
        : this.assessmentService.submitTechnicalAssessment(
            this.assessmentId,
            this.answers(),
            this.questions()
          );

    submit$
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
          this.showConfirmDialog.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.toast(
              this.i18n.t('take_assessment.submit_success'),
              'success'
            );
            this.router.navigate(['/app/employee-dashboard']);
          } else {
            this.toastService.toast(
              response.message || this.i18n.t('take_assessment.submit_failed'),
              'error'
            );
          }
        },
        error: (error) => {
          console.error('Failed to submit assessment', error);
          this.toastService.toast(
            this.i18n.t('take_assessment.load_error'),
            'error'
          );
        },
      });
  }

  readonly headingText = computed(() => {
    if (this.isReadOnly()) {
      return this.i18n.t('take_assessment.assessment_results');
    }
    return this.assessmentType === 'technical'
      ? this.i18n.t('take_assessment.technical_assessment')
      : this.i18n.t('take_assessment.manager_assessment');
  });

  readonly questionOfLabel = computed(() =>
    this.i18n.t('take_assessment.question_of', {
      current: this.currentQuestionIndex() + 1,
      total: this.totalQuestions(),
    })
  );

  readonly primaryButtonLabel = computed(() => {
    if (!this.isLastQuestion()) return this.i18n.t('take_assessment.next');
    return this.isReadOnly()
      ? this.i18n.t('take_assessment.close_results')
      : this.i18n.t('take_assessment.submit_finish');
  });

  readonly rootClass = computed(() =>
    cn(
      'min-h-screen bg-background py-12 px-4 transition-all duration-500',
      this.isRtl() && 'rtl'
    )
  );

  readonly progressWrapClass = computed(() =>
    cn(
      'w-full md:w-auto space-y-1',
      this.isRtl() ? 'text-right md:text-left' : 'text-left md:text-right'
    )
  );

  optionButtonClass(idx: number): string {
    const isSelected = this.currentAnswer() === idx;
    return cn(
      'group flex items-center p-5 rounded-2xl border-2 transition-all duration-300',
      this.isRtl() ? 'text-right' : 'text-left',
      isSelected
        ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10'
        : 'bg-background border-border hover:border-primary/20 hover:bg-muted/50 shadow-sm'
    );
  }

  optionBadgeClass(idx: number): string {
    const isSelected = this.currentAnswer() === idx;
    return cn(
      'w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
      this.isRtl() ? 'ml-4' : 'mr-4',
      isSelected
        ? 'bg-primary border-primary text-primary-foreground'
        : 'bg-background border-border text-muted-foreground group-hover:border-primary/30'
    );
  }

  optionTextClass(idx: number): string {
    const isSelected = this.currentAnswer() === idx;
    return cn(
      'text-lg font-bold transition-colors',
      isSelected
        ? 'text-foreground'
        : 'text-foreground/80 group-hover:text-primary'
    );
  }

  likertButtonClass(val: number): string {
    const isSelected = this.currentAnswer() === val;
    return cn(
      'flex flex-col items-center gap-2 md:gap-4 flex-1 p-3 sm:p-4 md:p-6 rounded-xl md:rounded-2xl border-2 transition-all duration-300',
      isSelected
        ? 'bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105'
        : 'bg-background border-border text-muted-foreground hover:border-primary/20 hover:bg-muted/50'
    );
  }

  readonly primaryButtonClass = computed(() =>
    cn(
      'px-10 py-6 h-auto text-lg font-bold',
      this.isLastQuestion() && !this.isReadOnly()
        ? 'bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-100'
        : '',
      this.isLastQuestion() && this.isReadOnly()
        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100'
        : '',
      !this.isReadOnly() && !this.hasAnswered()
        ? 'opacity-50 cursor-not-allowed'
        : ''
    )
  );
}
