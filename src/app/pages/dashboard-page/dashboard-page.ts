import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { ToastService } from '@/services/toast.service';
import { TourService } from '@/services/tour.service';
import { AnalysisService } from '@/services/analysis.service';
import { getTourSteps } from '@/shared/config/tour-config';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { BadgeDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { JobForm } from '@/components/dashboard/job-form/job-form';
import type { JobFormSubmission } from '@/models/job-form.model';
import { ResultsView } from '@/components/dashboard/results-view/results-view';
import { CompetencySelector } from '@/components/dashboard/competency-selector/competency-selector';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `pages/DashboardPage.tsx`. */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonDirective,
    ...CARD_DIRECTIVES,
    BadgeDirective,
    Icon,
    JobForm,
    ResultsView,
    CompetencySelector,
    TranslatePipe,
  ],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly toastService = inject(ToastService);
  private readonly tour = inject(TourService);
  private readonly analysisService = inject(AnalysisService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isAnalyzing = signal(false);
  readonly isSaving = signal(false);
  readonly progress = signal(0);
  readonly analysisResult = signal<any>(null);
  readonly view = signal<'analyzer' | 'history'>('analyzer');
  readonly historyItems = signal<any[]>([]);
  readonly isLoadingHistory = signal(false);
  readonly isRefining = signal(false);
  readonly tempData = signal<JobFormSubmission | null>(null);

  /** Read once, matching the React lazy `useState` initialiser. */
  readonly setupData = signal<any>(this.readSetupData());

  private tourTimer?: ReturnType<typeof setTimeout>;

  private readSetupData(): any {
    const setupDataStr = localStorage.getItem('currentAnalysisSetup');
    if (setupDataStr) {
      try {
        const data = JSON.parse(setupDataStr);
        if (data.title && data.description) {
          return data;
        }
      } catch (e) {
        console.error('Failed to parse setup data', e);
      }
    }
    return null;
  }

  readonly initialFormData = computed(() => {
    const setup = this.setupData();
    return setup
      ? {
          jobTitle: setup.title,
          jobDescription: setup.description,
          jobLevel: setup.level?.toString(),
        }
      : undefined;
  });

  readonly organizationName = computed(
    () =>
      this.auth.user()?.organization_name ||
      localStorage.getItem('companyName') ||
      ''
  );

  readonly currentUserId = computed(
    () => this.auth.user()?.id || localStorage.getItem('userId') || ''
  );

  ngOnInit(): void {
    if (!this.tour.hasSeen('dashboard')) {
      this.tourTimer = setTimeout(() => {
        this.tour.startTour(getTourSteps(this.i18n)['dashboard'], 'dashboard');
      }, 1000);
    }

    void this.loadHistory();

    const setupData = this.setupData();
    if (setupData && setupData.title && setupData.description) {
      this.handleAnalyze({
        inputMethod: 'database',
        jobTitle: setupData.title,
        jobDescription: setupData.description,
        jobLevel: String(setupData.level || 3),
        competencySource: setupData.competencyMode || 'ai',
      });
      // Clear after starting analysis
      localStorage.removeItem('currentAnalysisSetup');
    }
  }

  ngOnDestroy(): void {
    if (this.tourTimer) clearTimeout(this.tourTimer);
  }

  showHistory(): void {
    this.view.set('history');
    this.loadHistory();
  }

  loadHistory(): void {
    this.isLoadingHistory.set(true);
    this.analysisService
      .getAnalyzedTitles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.historyItems.set(response.data.titles);
          }
          this.isLoadingHistory.set(false);
        },
        error: (error) => {
          console.error('Failed to load history:', error);
          this.isLoadingHistory.set(false);
        },
      });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString(
      this.i18n.language() === 'ar' ? 'ar-EG' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' }
    );
  }

  handleLoadFromHistory(jobTitle: string): void {
    this.isAnalyzing.set(true);
    this.progress.set(30);

    const organizationName =
      this.auth.user()?.organization_name ||
      localStorage.getItem('companyName');

    this.analysisService
      .getCompetenciesByTitle(jobTitle, organizationName || undefined)
      .pipe(
        finalize(() => {
          this.isAnalyzing.set(false);
          this.progress.set(0);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            const transformed = this.mapBackendToFrontend(response.data);
            this.analysisResult.set(transformed);
            this.view.set('analyzer');
          }
        },
        error: (error) => {
          console.error('Failed to load history item:', error);
          this.toastService.toast(this.i18n.t('errors.generic_error'), 'error');
        },
      });
  }

  private mapBackendToFrontend(backendData: any): any {
    const t = (key: string, params?: Record<string, string | number>) =>
      this.i18n.t(key, params);

    // Backend can either be the raw analysis or the saved competencies structure
    const isSavedFormat = backendData.competencies !== undefined;
    const analysis_results = isSavedFormat
      ? backendData.grouped_competencies
      : backendData.analysis_results;
    const job_title = backendData.job_title;

    if (isSavedFormat) {
      // Mapping from the saved competencies list format
      const mapList = (list: any[] = [], category: string) =>
        list.map((c) => ({
          name: c.competency_name,
          category,
          priority: c.priority_score,
          weight: c.weight || 0,
          description: t('results.description_fallback', {
            name: c.competency_name,
          }),
          skills: c.skills || [],
          kpis: c.kpis || [],
        }));

      return {
        job_title,
        summary: t('results.summary_success'),
        competencies: {
          core: mapList(analysis_results.core_competency, 'Core'),
          behavioral: mapList(
            analysis_results.general_behavioral_competency,
            'Behavioral'
          ),
          leadership: mapList(
            analysis_results.leadership_behavioural_competency,
            'Leadership'
          ),
          technical: mapList(analysis_results.technical_competency, 'Technical'),
        },
        stats: {
          words_analyzed: 250,
          skills_identified: backendData.total_count,
          sections_analyzed: 5,
          confidence_score: 90,
        },
        raw_results: backendData, // Keep for reference
      };
    }

    // Original analysis results format
    const skillsMap = new Map<string, string[]>();
    analysis_results.skills_data?.skills?.forEach((s: any) => {
      if (!skillsMap.has(s.competency)) skillsMap.set(s.competency, []);
      skillsMap.get(s.competency)!.push(s.skill);
    });

    const kpisMap = new Map<string, string[]>();
    analysis_results.kpis_data?.kpis?.forEach((k: any) => {
      if (!kpisMap.has(k.competency)) kpisMap.set(k.competency, []);
      kpisMap.get(k.competency)!.push(k.kpi);
    });

    const priorityMap = new Map<string, number>();
    analysis_results.ranked_competencies?.ranked_competencies?.forEach(
      (r: any) => {
        priorityMap.set(r.competency, r.priority);
      }
    );

    const weightsMap = new Map<string, unknown>();
    if (analysis_results.weighted_competencies) {
      Object.entries(analysis_results.weighted_competencies).forEach(
        ([name, weight]) => {
          weightsMap.set(name, weight);
        }
      );
    }

    const transformCompetency = (name: string, category: string): any => ({
      name,
      category,
      priority: priorityMap.get(name) || 3,
      weight: weightsMap.get(name) || 0,
      description: t('results.description_fallback', { name: name }),
      skills: skillsMap.get(name) || [],
      kpis: kpisMap.get(name) || [],
    });

    return {
      job_title: job_title || t('defaults.custom_job'),
      summary: t('results.summary_success'),
      competencies: {
        core: (analysis_results.core_competencies || []).map((c: string) =>
          transformCompetency(c, 'Core')
        ),
        behavioral: (analysis_results.general_behavioral_competencies || []).map(
          (c: string) => transformCompetency(c, 'Behavioral')
        ),
        leadership: (
          analysis_results.leadership_behavioral_competencies || []
        ).map((c: string) => transformCompetency(c, 'Leadership')),
        technical: (analysis_results.technical_competencies || []).map(
          (c: string) => transformCompetency(c, 'Technical')
        ),
      },
      stats: {
        words_analyzed: 342,
        skills_identified: analysis_results.skills_data?.skills?.length || 0,
        sections_analyzed: 5,
        confidence_score: 85,
      },
      raw_results: backendData,
    };
  }

  handleAnalyze(data: JobFormSubmission): void {
    this.isAnalyzing.set(true);
    this.progress.set(0);
    this.analysisResult.set(null);
    this.tempData.set(data); // Store inputs

    const jobId = `job_${Date.now()}`;
    const user = this.auth.user();
    const organizationName =
      user?.organization_name || localStorage.getItem('companyName');

    const requestData = {
      job_description_id: jobId,
      job_title: data.jobTitle,
      job_description: {
        الوصف_الكامل: data.jobDescription,
        النص: data.jobDescription,
      },
      job_level: parseInt(data.jobLevel) || 3,
      organization_name: organizationName || undefined,
      async: true,
    };

    this.analysisService
      .analyzeJob(requestData)
      .pipe(
        switchMap((initialResponse: any) => {
          // Save JD to backend for persistence (so it shows up with checkmark
          // and auto-fills later). A failure here must not abort the analysis.
          const saveJd$ = organizationName
            ? this.analysisService
                .saveJobDescription({
                  organization_name: organizationName,
                  job_title: data.jobTitle,
                  job_description: data.jobDescription,
                  user_id: user?.id,
                })
                .pipe(
                  catchError((saveError) => {
                    console.error(
                      'Failed to save JD for persistence:',
                      saveError
                    );
                    return of(null);
                  })
                )
            : of(null);

          return saveJd$.pipe(
            switchMap(() =>
              initialResponse.task_id
                ? this.analysisService.pollAnalysis(
                    initialResponse.task_id,
                    (p) => this.progress.set(p)
                  )
                : of(initialResponse)
            )
          );
        }),
        finalize(() => this.isAnalyzing.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          this.analysisResult.set(this.mapBackendToFrontend(result));
          this.isRefining.set(true); // Open refinement modal
        },
        error: (error) => {
          console.error('Analysis failed:', error);
          alert(this.i18n.t('errors.analysis_failed'));
        },
      });
  }

  handleRefinementConfirm(refined: any): void {
    this.analysisResult.set(refined);
    this.isRefining.set(false);
  }

  handleSaveResults(): void {
    const analysisResult = this.analysisResult();
    if (!analysisResult || !analysisResult.raw_results) return;

    this.isSaving.set(true);

    const user = this.auth.user();
    const organizationName =
      user?.organization_name || localStorage.getItem('companyName');

    const priorities: Record<string, number> = {};
    [
      ...analysisResult.competencies.core,
      ...analysisResult.competencies.behavioral,
      ...analysisResult.competencies.leadership,
      ...analysisResult.competencies.technical,
    ].forEach((c: any) => {
      priorities[c.name] = c.priority;
    });

    this.analysisService
      .saveAnalysisResults({
        job_description_id:
          analysisResult.raw_results.job_description_id ||
          `saved_${Date.now()}`,
        job_title: analysisResult.job_title,
        job_level: analysisResult.raw_results.job_level || 3,
        analysis_results:
          analysisResult.raw_results.analysis_results ||
          analysisResult.raw_results,
        competency_priorities: priorities,
        organization_name: organizationName || undefined,
        user_id: user?.id,
        employee_id:
          analysisResult.raw_results.employee_id || `emp_${Date.now()}`,
      })
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.toast(
              this.i18n.t('competencies.save_success_msg'),
              'success'
            );
            // Reload history so new save appears there
            setTimeout(() => this.loadHistory(), 500); // Small delay for DB consistency
          } else {
            this.toastService.toast(
              this.i18n.t('errors.save_error_msg') + ': ' + response.message,
              'error'
            );
          }
        },
        error: (error) => {
          console.error('Save failed:', error);
          this.toastService.toast(
            this.i18n.t('errors.save_error_msg'),
            'error'
          );
        },
      });
  }

  viewButtonClass(target: 'analyzer' | 'history'): string {
    return cn(
      'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 relative overflow-hidden',
      this.view() === target
        ? 'text-primary-foreground shadow-lg shadow-primary/25 -translate-y-px'
        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
    );
  }

  readonly playIconClass = computed(() =>
    cn(
      'w-4 h-4 z-10 relative',
      this.view() === 'analyzer' ? 'fill-primary-foreground/20' : ''
    )
  );
}
