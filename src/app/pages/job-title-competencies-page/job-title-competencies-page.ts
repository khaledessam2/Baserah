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
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { ToastService } from '@/services/toast.service';
import { TourService } from '@/services/tour.service';
import { AnalysisService } from '@/services/analysis.service';
import { AssessmentService } from '@/services/assessment.service';
import { getTourSteps } from '@/shared/config/tour-config';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { ConfirmationModal } from '@/shared/components/confirmation-modal/confirmation-modal';
import { BadgeDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { Slider } from '@/shared/components/slider/slider';
import { TABS_DIRECTIVES } from '@/shared/components/tabs';
import { AddCompetencyModal } from '@/components/competencies/add-competency-modal/add-competency-modal';
import { EditCompetencyModal } from '@/components/competencies/edit-competency-modal/edit-competency-modal';
import { EditJobDescriptionModal } from '@/components/competencies/edit-job-description-modal/edit-job-description-modal';
import type { CompetencyData } from '@/models/competency.model';
import { CompetencyCategorySection } from '@/components/competencies/competency-category-section/competency-category-section';
import { CompetencyStatsCard } from '@/components/competencies/competency-stats-card/competency-stats-card';
import { KpiCategorySection } from '@/components/competencies/kpi-category-section/kpi-category-section';
import type { Competency } from '@/models/competency.model';
import { AddKpiModal } from '@/components/competencies/add-kpi-modal/add-kpi-modal';
import { EditKpiModal } from '@/components/competencies/edit-kpi-modal/edit-kpi-modal';
import type { AddKpiPayload, EditKpiPayload } from '@/models/kpi.model';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

type TabType = 'jd' | 'competencies' | 'kpis' | 'assessments';

/** Port of `pages/JobTitleCompetenciesPage.tsx`. */
@Component({
  selector: 'app-job-title-competencies-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonDirective,
    ...CARD_DIRECTIVES,
    ...TABS_DIRECTIVES,
    BadgeDirective,
    Icon,
    Slider,
    ConfirmationModal,
    AddCompetencyModal,
    EditCompetencyModal,
    EditJobDescriptionModal,
    CompetencyCategorySection,
    CompetencyStatsCard,
    KpiCategorySection,
    AddKpiModal,
    EditKpiModal,
    TranslatePipe,
  ],
  templateUrl: './job-title-competencies-page.html',
})
export class JobTitleCompetenciesPage implements OnInit, OnDestroy {
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly toastService = inject(ToastService);
  private readonly tour = inject(TourService);
  private readonly analysisService = inject(AnalysisService);
  private readonly assessmentService = inject(AssessmentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly jobTitle = signal('');
  readonly loading = signal(true);
  readonly jd = signal('');
  readonly allCompetencies = signal<Competency[]>([]);
  readonly grouped = signal<Record<string, Competency[]>>({});

  // Modals state
  readonly isEditJdOpen = signal(false);
  readonly isAddCompetencyOpen = signal(false);
  readonly editingCompetency = signal<Competency | null>(null);
  readonly isDeleteModalOpen = signal(false);
  readonly competencyToDelete = signal<string | null>(null);

  // Stats and KPIs
  readonly generatedKpis = signal<any[]>([]);
  readonly savedKpis = signal<any[]>([]);
  readonly isGeneratingKpis = signal(false);
  readonly isSavingKpis = signal(false);

  // KPI Modals State
  readonly isAddKpiModalOpen = signal(false);
  readonly editingKpi = signal<any | null>(null);
  readonly kpiToDelete = signal<any | null>(null);
  readonly isKpiDeleteModalOpen = signal(false);

  // Weights State
  readonly isReweighting = signal(false);
  readonly isSavingWeights = signal(false);

  // Assessment State
  readonly isGeneratingAssessment = signal(false);
  readonly hasAssessment = signal(false);
  readonly technicalQuestions = signal<any[]>([]);
  readonly managerQuestions = signal<any[]>([]);

  // Tabs State
  readonly activeTab = signal<TabType>('competencies');

  private tourTimer?: ReturnType<typeof setTimeout>;

  readonly organizationName = computed(
    () =>
      this.auth.user()?.organization_name ||
      localStorage.getItem('companyName') ||
      ''
  );

  ngOnInit(): void {
    this.jobTitle.set(this.route.snapshot.queryParamMap.get('jobTitle') || '');
    this.loadData();

    // Auto-start tour if not seen before
    if (!this.tour.hasSeen('job-title-competencies')) {
      this.tourTimer = setTimeout(() => {
        this.tour.startTour(
          getTourSteps(this.i18n)['job-title-competencies'],
          'job-title-competencies'
        );
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.tourTimer) clearTimeout(this.tourTimer);
  }

  loadData(): void {
    const jobTitle = this.jobTitle();
    if (!jobTitle) {
      // Nothing to query without a job title — drop the spinner so the empty
      // state shows instead of loading forever.
      this.loading.set(false);
      return;
    }
    this.loading.set(true);

    const userId = this.auth.user()?.id;

    forkJoin({
      // Load JD
      jdResponse: this.analysisService.getExistingJobDescription(
        this.organizationName(),
        jobTitle,
        userId
      ),
      // Load Competencies
      compResponse: this.analysisService.getCompetenciesByTitle(
        jobTitle,
        this.organizationName(),
        userId
      ),
      // Load Saved KPIs
      kpiResponse: this.analysisService.getKpisByJobTitle(
        jobTitle,
        this.organizationName(),
        userId
      ),
      // Check for Assessments — a 404 here just means "none yet", so it must
      // not fail the whole load.
      assessmentRes: this.assessmentService
        .retrieveAssessment(jobTitle, this.organizationName())
        .pipe(catchError(() => of(null))),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ jdResponse, compResponse, kpiResponse, assessmentRes }) => {
          if (jdResponse.success) {
            this.jd.set(jdResponse.data.job_description || '');
          }

          if (compResponse.success && compResponse.data) {
            this.allCompetencies.set(compResponse.data.competencies || []);
            this.grouped.set(compResponse.data.grouped_competencies || {});
          }

          if (
            kpiResponse.success &&
            kpiResponse.data &&
            kpiResponse.data.kpis
          ) {
            this.savedKpis.set(kpiResponse.data.kpis);
          }

          // Check for technical_assessment.questions (correct structure from backend)
          const techQuestions =
            assessmentRes?.technical_assessment?.questions ||
            assessmentRes?.data?.technical_assessment?.questions ||
            [];
          const mgrQuestions =
            assessmentRes?.manager_assessment?.questions ||
            assessmentRes?.data?.manager_assessment?.questions ||
            [];

          if (techQuestions.length > 0 || mgrQuestions.length > 0) {
            this.hasAssessment.set(true);
            this.technicalQuestions.set(techQuestions);
            this.managerQuestions.set(mgrQuestions);
          } else {
            this.hasAssessment.set(false);
            this.technicalQuestions.set([]);
            this.managerQuestions.set([]);
          }
        },
        error: (error) =>
          console.error('Failed to load job title data:', error),
      });
  }

  // --- Handlers ---

  handleSaveJd(newDescription: string): void {
    this.analysisService
      .saveJobDescription({
        organization_name: this.organizationName(),
        job_title: this.jobTitle(),
        job_description: newDescription,
        user_id: this.auth.user()?.id,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.jd.set(newDescription);
          }
        },
        error: (error) => {
          console.error('Failed to save JD', error);
          alert(this.i18n.t('job_title_competencies.jd_save_failed'));
        },
      });
  }

  handleAddCompetency(data: CompetencyData): void {
    // Data processing matching HTML logic
    const payload = {
      job_title: this.jobTitle(),
      competency_name: data.competency_name,
      competency_type: data.competency_type,
      priority_score: data.priority_score,
      confidence_score: data.confidence_score,
      weight: data.weight > 1 ? data.weight / 100 : data.weight, // Handle % input
      skills: data.skills,
      user_id: this.auth.user()?.id,
      organization_name: this.organizationName(),
      isNew: true,
    };

    this.analysisService
      .saveCompetency(this.jobTitle(), '', payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.toast(
            this.i18n.t('job_title_competencies.competency.add_success'),
            'success'
          );
          this.loadData();
        },
        error: (e) => {
          console.error(e);
          this.toastService.toast(
            this.i18n.t('job_title_competencies.competency.add_failed'),
            'error'
          );
        },
      });
  }

  readonly editingCompetencyData = computed<CompetencyData | null>(() => {
    const comp = this.editingCompetency();
    return comp ? { ...comp } : null;
  });

  handleEditCompetency(data: CompetencyData): void {
    const editing = this.editingCompetency();
    if (!editing) return;

    const payload = {
      job_title: this.jobTitle(),
      competency_name: editing.competency_name,
      new_competency_name:
        data.competency_name !== editing.competency_name
          ? data.competency_name
          : undefined,
      priority_score: data.priority_score,
      confidence_score: data.confidence_score,
      weight: data.weight > 1 ? data.weight / 100 : data.weight,
      skills: data.skills,
      rank: data.rank,
      isNew: false,
    };

    this.analysisService
      .saveCompetency(this.jobTitle(), editing.competency_name, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.toast(
            this.i18n.t('job_title_competencies.competency.edit_success'),
            'success'
          );
          this.loadData();
        },
        error: (e) => {
          console.error(e);
          this.toastService.toast(
            this.i18n.t('job_title_competencies.competency.edit_failed'),
            'error'
          );
        },
      });
  }

  handleDeleteClick(competencyName: string): void {
    this.competencyToDelete.set(competencyName);
    this.isDeleteModalOpen.set(true);
  }

  readonly deleteDescription = computed(() =>
    this.i18n.t('job_title_competencies.competency.delete_confirm', {
      name: this.competencyToDelete() ?? '',
    })
  );

  handleConfirmDelete(): void {
    const competencyToDelete = this.competencyToDelete();
    if (!competencyToDelete) return;
    this.analysisService
      .deleteCompetency(this.jobTitle(), competencyToDelete)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.toast(
            this.i18n.t('job_title_competencies.competency.delete_success'),
            'success'
          );
          this.loadData();
        },
        error: (e) => {
          console.error(e);
          this.toastService.toast(
            this.i18n.t('job_title_competencies.competency.delete_failed'),
            'error'
          );
        },
      });
  }

  handleGenerateKpis(): void {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    this.isGeneratingKpis.set(true);

    const competencies = this.allCompetencies();
    if (competencies.length === 0) {
      this.toastService.toast(
        this.i18n.t('job_title_competencies.kpi_generate_empty'),
        'info'
      );
      this.isGeneratingKpis.set(false);
      return;
    }

    // Generate KPIs for all competencies in parallel — much faster than a
    // sequential loop.
    const kpiRequests = competencies.map((comp) => {
      // Map frontend competency type to backend expected keys
      const backendTypeMap: Record<string, string> = {
        core_competency: 'core',
        general_behavioural_competency: 'general_behavioral',
        leadership_behavioural_competency: 'leadership_behavioral',
        technical_competency: 'technical',
      };

      const typeKey = backendTypeMap[comp.competency_type] || 'core';

      // Build selected_competencies with the specific competency in its
      // correct category
      const selectedComps = {
        core: typeKey === 'core' ? [comp.competency_name] : [],
        general_behavioral:
          typeKey === 'general_behavioral' ? [comp.competency_name] : [],
        leadership_behavioral:
          typeKey === 'leadership_behavioral' ? [comp.competency_name] : [],
        technical: typeKey === 'technical' ? [comp.competency_name] : [],
      };

      return this.analysisService
        .generateKpis(
          this.jobTitle(),
          this.organizationName(),
          userId,
          selectedComps,
          this.jd()
        )
        .pipe(
          map((response) => {
            if (
              response &&
              response.kpis_data &&
              Array.isArray(response.kpis_data.kpis)
            ) {
              // Attach competency name and type to each generated KPI
              return response.kpis_data.kpis.map((kpi: any) => ({
                ...kpi,
                competency: comp.competency_name,
                competency_type: comp.competency_type,
                type: comp.competency_type,
              }));
            }
            return [];
          }),
          // One competency failing must not lose the KPIs of the others.
          catchError((err) => {
            console.warn(
              `Failed to generate KPIs for competency: ${comp.competency_name}`,
              err
            );
            return of([]);
          })
        );
    });

    forkJoin(kpiRequests)
      .pipe(
        finalize(() => this.isGeneratingKpis.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (results) => {
          const allGeneratedKpis = results.flat();

          if (allGeneratedKpis.length > 0) {
            this.generatedKpis.set(allGeneratedKpis);
            this.toastService.toast(
              this.i18n.t('job_title_competencies.kpi_generate_success'),
              'success'
            );
          } else {
            this.toastService.toast(
              this.i18n.t('job_title_competencies.kpi_generate_empty'),
              'info'
            );
          }
        },
        error: (e) => {
          console.error(e);
          this.toastService.toast(
            this.i18n.t('job_title_competencies.kpi_generate_failed'),
            'error'
          );
        },
      });
  }

  handleSaveKpis(): void {
    if (this.generatedKpis().length === 0) return;
    this.isSavingKpis.set(true);

    // Ensure each KPI has competency and competency_type fields
    const kpisToSave = this.generatedKpis().map((kpi: any) => ({
      ...kpi,
      competency: kpi.competency || 'job_description',
      competency_type: kpi.competency_type || kpi.type || 'core_competency',
      type: kpi.type || kpi.competency_type || 'core_competency',
    }));

    this.analysisService
      .saveKpis({
        job_title: this.jobTitle(),
        organization_name: this.organizationName(),
        user_id: this.auth.user()?.id,
        kpis: kpisToSave,
      })
      .pipe(
        finalize(() => this.isSavingKpis.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.toastService.toast(
            this.i18n.t('job_title_competencies.kpi_save_success'),
            'success'
          );
          this.savedKpis.update((prev) => [...prev, ...kpisToSave]);
          this.generatedKpis.set([]);
          // Reload data to reflect saved KPIs
          this.loadData();
        },
        error: (e) => {
          console.error(e);
          this.toastService.toast(
            this.i18n.t('job_title_competencies.kpi_save_failed'),
            'error'
          );
        },
      });
  }

  /** Delete individual generated KPI before save. */
  handleDeleteGeneratedKpi(index: number): void {
    this.generatedKpis.update((prev) => prev.filter((_, i) => i !== index));
  }

  // --- Saved KPI Handlers ---
  handleAddKpi(data: AddKpiPayload): void {
    this.analysisService
      .addKpi({
        job_title: this.jobTitle(),
        kpi_text: data.kpi_text,
        performance_dimension: data.performance_dimension,
        measurement_type: data.measurement_type,
        target_period: data.target_period,
        competency: data.competency,
        competency_type: data.competency_type,
        organization_name: this.organizationName(),
        user_id: this.auth.user()?.id,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.toast(
            this.i18n.t('job_title_competencies.kpi_add_success'),
            'success'
          );
          this.isAddKpiModalOpen.set(false);
          this.loadData();
        },
        error: (e) => {
          console.error(e);
          this.toastService.toast(
            this.i18n.t('job_title_competencies.kpi_add_failed'),
            'error'
          );
        },
      });
  }

  handleEditKpi(data: EditKpiPayload): void {
    const editingKpi = this.editingKpi();
    if (!editingKpi) return;
    this.analysisService
      .updateKpi({
        job_title: this.jobTitle(),
        kpi_text: editingKpi.kpi || editingKpi.kpi_text,
        performance_dimension: data.performance_dimension,
        measurement_type: data.measurement_type,
        target_period: data.target_period,
        organization_name: this.organizationName(),
        user_id: this.auth.user()?.id,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.toast(
            this.i18n.t('job_title_competencies.kpi_edit_success'),
            'success'
          );
          this.editingKpi.set(null);
          this.loadData();
        },
        error: (e) => {
          console.error(e);
          this.toastService.toast(
            this.i18n.t('job_title_competencies.kpi_edit_failed'),
            'error'
          );
        },
      });
  }

  handleDeleteKpiClick(kpi: any): void {
    this.kpiToDelete.set(kpi);
    this.isKpiDeleteModalOpen.set(true);
  }

  readonly kpiDeleteDescription = computed(() => {
    const kpi = this.kpiToDelete();
    return `${this.i18n.t(
      'job_title_competencies.kpis.confirm_delete_desc'
    )}\n"${kpi?.kpi || kpi?.kpi_text || ''}"`;
  });

  handleConfirmDeleteKpi(): void {
    const kpiToDelete = this.kpiToDelete();
    if (!kpiToDelete) return;
    this.analysisService
      .deleteKpi(
        this.jobTitle(),
        kpiToDelete.kpi || kpiToDelete.kpi_text,
        this.auth.user()?.id,
        this.organizationName()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.toast(
            this.i18n.t('job_title_competencies.kpi_delete_success'),
            'success'
          );
          this.isKpiDeleteModalOpen.set(false);
          this.kpiToDelete.set(null);
          this.loadData();
        },
        error: (e) => {
          console.error(e);
          this.toastService.toast(
            this.i18n.t('job_title_competencies.kpi_delete_failed'),
            'error'
          );
        },
      });
  }

  /** Group saved KPIs by competency type. */
  readonly groupedKpis = computed<Record<string, any[]>>(() => {
    const groups: Record<string, any[]> = {
      core_competency: [],
      general_behavioural_competency: [],
      leadership_behavioural_competency: [],
      technical_competency: [],
    };
    this.savedKpis().forEach((kpi) => {
      let type = kpi.competency_type || kpi.type || 'core_competency';
      // Normalize type names
      if (type.includes('core')) type = 'core_competency';
      else if (type.includes('general') && type.includes('behav'))
        type = 'general_behavioural_competency';
      else if (type.includes('leadership') && type.includes('behav'))
        type = 'leadership_behavioural_competency';
      else if (type.includes('technical')) type = 'technical_competency';
      else type = 'core_competency';

      if (groups[type]) groups[type].push(kpi);
      else groups['core_competency'].push(kpi);
    });
    return groups;
  });

  handleReweightAI(): void {
    if (!this.jobTitle() || !this.jd()) {
      this.toastService.toast(
        this.i18n.t('job_title_competencies.assessment_missing_data'),
        'error'
      );
      return;
    }
    this.isReweighting.set(true);
    this.analysisService
      .reweightCompetencies({
        job_title: this.jobTitle(),
        job_description: { description: this.jd() },
        user_id: this.auth.user()?.id || '',
        organization_name: this.organizationName(),
      })
      .pipe(
        finalize(() => this.isReweighting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data?.competencies) {
            this.allCompetencies.set(response.data.competencies);
            // Weights don't normally change groups, but re-group just in case
            const newGrouped = response.data.competencies.reduce(
              (acc: Record<string, Competency[]>, curr: Competency) => {
                const type = curr.competency_type;
                if (!acc[type]) acc[type] = [];
                acc[type].push(curr);
                return acc;
              },
              {} as Record<string, Competency[]>
            );
            this.grouped.set(newGrouped);
            this.toastService.toast(
              this.i18n.t('job_title_competencies.weights_reweight_success'),
              'success'
            );
          }
        },
        error: (error) => {
          console.error('Failed to reweight:', error);
          this.toastService.toast(
            this.i18n.t('job_title_competencies.weights_reweight_failed'),
            'error'
          );
        },
      });
  }

  handleGenerateAssessment(): void {
    const userId = this.auth.user()?.id;
    if (!this.jobTitle() || !userId) {
      this.toastService.toast(
        this.i18n.t('job_title_competencies.assessment_missing_data'),
        'error'
      );
      return;
    }
    this.isGeneratingAssessment.set(true);
    this.analysisService
      .generateAssessment(this.jobTitle(), this.organizationName(), userId)
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(
              response.message ||
                this.i18n.t('job_title_competencies.assessment_generate_failed')
            );
          }
          return response;
        }),
        finalize(() => this.isGeneratingAssessment.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          // Update hasAssessment state after successful generation
          this.hasAssessment.set(true);
          this.toastService.toast(
            this.i18n.t('job_title_competencies.assessment_generate_success', {
              tech: response.technical_questions_count || 10,
              manager: response.manager_questions_count || 10,
            }),
            'success'
          );
        },
        error: (error: any) => {
          console.error('Failed to generate assessment:', error);
          this.toastService.toast(
            error.message ||
              this.i18n.t('job_title_competencies.assessment_generate_failed'),
            'error'
          );
        },
      });
  }

  handleSaveWeights(): void {
    this.isSavingWeights.set(true);

    const weightsMap: Record<string, number> = {};
    this.allCompetencies().forEach((c) => {
      weightsMap[c.competency_name] = c.weight || 0;
    });

    this.analysisService
      .saveWeights({
        job_title: this.jobTitle(),
        weights: weightsMap,
        user_id: this.auth.user()?.id,
        organization_name: this.organizationName(),
      })
      .pipe(
        finalize(() => this.isSavingWeights.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () =>
          this.toastService.toast(
            this.i18n.t('job_title_competencies.weights_save_success'),
            'success'
          ),
        error: (error) => {
          console.error('Failed to save weights:', error);
          this.toastService.toast(
            this.i18n.t('job_title_competencies.weights_save_failed'),
            'error'
          );
        },
      });
  }

  weightPercent(comp: Competency): number {
    return Math.round((comp.weight || 0) * 100);
  }

  updateWeight(competencyName: string, newVal: number): void {
    // newVal is 0-100 from slider
    const newWeight = newVal / 100;
    this.allCompetencies.update((prev) =>
      prev.map((c) =>
        c.competency_name === competencyName ? { ...c, weight: newWeight } : c
      )
    );
  }

  readonly totalWeight = computed(() =>
    this.allCompetencies().reduce((s, c) => s + (c.weight || 0), 0)
  );

  readonly totalWeightPercent = computed(() =>
    Math.round(this.totalWeight() * 100)
  );

  handleExport(): void {
    // Simple CSV export logic mimicking HTML
    const header = ['Competency Name', 'Type', 'Weight', 'Priority', 'Skills'];
    const rows = this.allCompetencies().map((c) => [
      c.competency_name,
      c.competency_type,
      `${(c.weight * 100).toFixed(1)}%`,
      c.priority_score,
      c.skills.join('; '),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [header.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${this.jobTitle()}_competencies.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Statistics ---
  readonly stats = computed(() => {
    const grouped = this.grouped();
    return {
      core: grouped['core_competency']?.length || 0,
      behavioral: grouped['general_behavioural_competency']?.length || 0,
      leadership: grouped['leadership_behavioural_competency']?.length || 0,
      technical: grouped['technical_competency']?.length || 0,
    };
  });

  isCorrectChoice(q: any, choice: string): boolean {
    return q.correct_answer === choice || q.answer === choice;
  }

  choiceClass(q: any, choice: string, tone: 'emerald' | 'amber'): string {
    if (!this.isCorrectChoice(q, choice)) {
      return 'bg-muted/50 border-border text-muted-foreground';
    }
    return tone === 'emerald'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
      : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400';
  }

  questionCardClass(tone: 'primary' | 'secondary'): string {
    return tone === 'primary'
      ? 'hover:border-primary/20'
      : 'hover:border-secondary/20';
  }

  readonly isBalancedWeight = computed(
    () => Math.abs(this.totalWeight() - 1) < 0.01
  );

  // Each of these is shared by several call sites, so it stays one computed
  // instead of being duplicated across the template.
  readonly smallIconClass = computed(
    () => 'w-4 h-4 ' + (this.isRtl() ? 'ml-1' : 'mr-1')
  );

  readonly mdIconClass = computed(
    () => 'w-4 h-4 ' + (this.isRtl() ? 'ml-2' : 'mr-2')
  );

  readonly mdSpinnerClass = computed(
    () => 'w-4 h-4 animate-spin ' + (this.isRtl() ? 'ml-2' : 'mr-2')
  );

  readonly lgIconClass = computed(
    () => 'w-5 h-5 ' + (this.isRtl() ? 'ml-2' : 'mr-2')
  );

  readonly lgSpinnerClass = computed(
    () => 'w-5 h-5 animate-spin ' + (this.isRtl() ? 'ml-2' : 'mr-2')
  );

  readonly tinyIconClass = computed(
    () => 'w-3 h-3 ' + (this.isRtl() ? 'ml-1' : 'mr-1')
  );

  readonly tinySpinnerClass = computed(
    () => 'w-3 h-3 animate-spin ' + (this.isRtl() ? 'ml-1' : 'mr-1')
  );

  readonly inlineCheckClass = computed(
    () => 'w-4 h-4 inline ' + (this.isRtl() ? 'mr-2' : 'ml-2')
  );
}
