import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, finalize, switchMap, tap } from 'rxjs';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { AnalysisService } from '@/services/analysis.service';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { LabelDirective, TextareaDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { SELECT_DIRECTIVES } from '@/shared/components/select';
import { TABS_DIRECTIVES } from '@/shared/components/tabs';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';
import type { JobFormSubmission, JobFormInitialData } from '@/models/job-form.model';

/** Port of `dashboard/JobForm.tsx`. */
@Component({
  selector: 'app-job-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonDirective,
    ...CARD_DIRECTIVES,
    LabelDirective,
    TextareaDirective,
    Icon,
    ...SELECT_DIRECTIVES,
    ...TABS_DIRECTIVES,
    TranslatePipe,
  ],
  templateUrl: './job-form.html',
})
export class JobForm {
  readonly isAnalyzing = input(false);
  readonly initialData = input<JobFormInitialData | undefined>(undefined);
  readonly analyze = output<JobFormSubmission>();

  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly analysisService = inject(AnalysisService);
  private readonly destroyRef = inject(DestroyRef);

  readonly inputMethod = signal<'database' | 'manual'>('database');
  readonly jobTitle = signal('');
  readonly jobDescription = signal('');
  readonly jobLevel = signal('3');
  readonly competencySource = signal('ai');

  // Real job titles from backend
  readonly availableTitles = signal<string[]>([]);
  readonly titlesInfo = signal<Record<string, boolean>>({});
  readonly isLoadingTitles = signal(false);
  readonly isGeneratingJD = signal(false);

  constructor() {
    effect(() => {
      const data = this.initialData();
      if (!data) return;
      if (data.jobTitle !== undefined) this.jobTitle.set(data.jobTitle);
      if (data.jobDescription !== undefined) {
        this.jobDescription.set(data.jobDescription);
      }
      if (data.jobLevel !== undefined) this.jobLevel.set(data.jobLevel);
    });

    // Fetch job titles on mount or user change
    effect(() => {
      this.auth.user();
      this.fetchJobTitles();
    });

    effect(() => {
      const title = this.jobTitle();
      if (
        this.inputMethod() === 'database' &&
        title &&
        this.titlesInfo()[title]
      ) {
        this.fetchExistingDescription(title);
      }
    });
  }

  readonly titlePlaceholder = computed(() =>
    this.isLoadingTitles()
      ? this.i18n.t('dashboard.loading_data')
      : this.i18n.t('analyzer.select_placeholder')
  );

  hasJd(title: string): boolean {
    return !!this.titlesInfo()[title.trim()];
  }

  fetchJobTitles(): void {
    this.isLoadingTitles.set(true);
    const companyName =
      localStorage.getItem('companyName') ||
      sessionStorage.getItem('companyName');
    const userId = this.auth.user()?.id || localStorage.getItem('userId');

    this.analysisService
      .getJobTitles(companyName || undefined, userId || undefined)
      .pipe(
        tap((titles) => this.availableTitles.set(titles.map((t) => t.trim()))),
        switchMap(() =>
          companyName
            ? this.analysisService.getJobTitlesWithJD(
                companyName,
                userId || undefined
              )
            : EMPTY
        ),
        finalize(() => this.isLoadingTitles.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (jdPresence) => this.titlesInfo.set(jdPresence),
        error: (error) => console.error('Failed to fetch job titles:', error),
      });
  }

  private fetchExistingDescription(title: string): void {
    const user = this.auth.user();
    const companyName =
      user?.organization_name ||
      localStorage.getItem('companyName') ||
      sessionStorage.getItem('companyName');
    const userId = user?.id || localStorage.getItem('userId');
    if (!companyName) return;

    this.analysisService
      .getExistingJobDescription(companyName, title, userId || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.data.job_description) {
            this.jobDescription.set(response.data.job_description);
          }
        },
        error: (error) => console.error('Failed to fetch existing JD:', error),
      });
  }

  handleGenerateDescription(): void {
    const jobTitle = this.jobTitle();
    if (!jobTitle) {
      alert(
        this.i18n.t('analyzer.error_select_title', 'Please select a job title first')
      );
      return;
    }

    const user = this.auth.user();
    const organizationName =
      user?.organization_name ||
      localStorage.getItem('companyName') ||
      sessionStorage.getItem('companyName');
    const userId = user?.id || localStorage.getItem('userId');

    this.isGeneratingJD.set(true);
    this.analysisService
      .generateJobDescription(jobTitle)
      .pipe(
        tap((description) => this.jobDescription.set(description)),
        // Save to backend immediately after generation
        switchMap((description) =>
          organizationName && description
            ? this.analysisService
                .saveJobDescription({
                  organization_name: organizationName,
                  job_title: jobTitle,
                  job_description: description,
                  user_id: userId || undefined,
                })
                .pipe(
                  // Refresh titles info to show the checkmark immediately
                  switchMap(() =>
                    this.analysisService.getJobTitlesWithJD(
                      organizationName,
                      userId || undefined
                    )
                  )
                )
            : EMPTY
        ),
        finalize(() => this.isGeneratingJD.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (jdPresence) => this.titlesInfo.set(jdPresence),
        error: (error) => {
          console.error('Failed to generate or save description:', error);
          alert(this.i18n.t('errors.analysis_failed'));
        },
      });
  }

  clearForm(): void {
    this.jobDescription.set('');
    this.jobTitle.set('');
  }

  handleSubmit(): void {
    if (!this.jobDescription().trim()) {
      alert(
        this.i18n.t('analyzer.error_jd_required', 'Please enter job description')
      );
      return;
    }
    this.analyze.emit({
      inputMethod: this.inputMethod(),
      jobTitle: this.jobTitle() || this.i18n.t('defaults.custom_job'),
      jobDescription: this.jobDescription(),
      jobLevel: this.jobLevel(),
      competencySource: this.competencySource(),
    });
  }
}
