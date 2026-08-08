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
import { FormsModule } from '@angular/forms';
import {
  catchError,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
  type Observable,
} from 'rxjs';
import { I18nService } from '@/services/i18n.service';
import { ToastService } from '@/services/toast.service';
import { TourService } from '@/services/tour.service';
import { AssessmentService } from '@/services/assessment.service';
import { DevelopmentService } from '@/services/development.service';
import { ManagerAssessmentService } from '@/services/manager-assessment.service';
import { ReportService } from '@/services/report.service';
import type { Assessment, GroupedEmployee } from '@/models/api.model';
import { getTourSteps } from '@/shared/config/tour-config';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { ChartComponent } from '@/shared/components/chart/chart';
import { Dialog, DialogHeaderDirective, DialogTitleDirective } from '@/shared/components/dialog';
import { BadgeDirective, InputDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';
import { Progress } from '@/shared/components/progress/progress';
import { SELECT_DIRECTIVES } from '@/shared/components/select';
import { TABS_DIRECTIVES } from '@/shared/components/tabs';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

interface ManagerStatus {
  manager_id: string;
  manager_name: string;
  manager_title: string;
  organization_name: string;
  status?: {
    total_team_members: number;
    assigned_count: number;
    submitted_count: number;
    is_complete: boolean;
    report_generated: boolean;
    report_id: string | null;
    sent_to_superior: boolean;
    remaining_count: number;
    percentage: number;
  };
}

/** `GroupedEmployee` plus the two fields the grouping pass attaches. */
type GroupedRow = GroupedEmployee & { hasPendingReevaluation?: boolean };

const LIKERT_COLORS = [
  'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20',
  'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-500/20',
  'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20',
  'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20',
  'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-500/20',
];

const LIKERT_KEYS = [
  ['likert.strongly_disagree', 'Strongly Disagree'],
  ['likert.disagree', 'Disagree'],
  ['likert.neutral', 'Neutral'],
  ['likert.agree', 'Agree'],
  ['likert.strongly_agree', 'Strongly Agree'],
] as const;

/** Port of `pages/ReportsPage.tsx`. */
@Component({
  selector: 'app-reports-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonDirective,
    ...CARD_DIRECTIVES,
    ...TABS_DIRECTIVES,
    ...SELECT_DIRECTIVES,
    BadgeDirective,
    InputDirective,
    Icon,
    Progress,
    ChartComponent,
    Dialog,
    DialogHeaderDirective,
    DialogTitleDirective,
    TranslatePipe,
  ],
  templateUrl: './reports-page.html',
})
export class ReportsPage implements OnInit, OnDestroy {
  private readonly i18n = inject(I18nService);
  private readonly toastService = inject(ToastService);
  private readonly tour = inject(TourService);
  private readonly assessmentService = inject(AssessmentService);
  private readonly reportService = inject(ReportService);
  private readonly managerAssessmentService = inject(ManagerAssessmentService);
  private readonly developmentService = inject(DevelopmentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly groupedEmployees = signal<GroupedRow[]>([]);
  readonly managers = signal<ManagerStatus[]>([]);
  readonly isLoading = signal(true);
  readonly isManagersLoading = signal(false);
  readonly searchTerm = signal('');

  // Filters
  readonly departmentFilter = signal('all');
  readonly jobTitleFilter = signal('all');
  readonly statusFilter = signal('all');

  readonly activeTab = signal('employees');

  // Modal State
  readonly isModalOpen = signal(false);
  readonly selectedManager = signal<ManagerStatus | null>(null);
  readonly evaluations = signal<any[]>([]);
  readonly selectedEvaluationIdx = signal<number | null>(null);
  readonly questionsMap = signal<Record<number, any>>({});
  readonly isModalLoading = signal(false);

  // Re-evaluation Modal State
  readonly isReevalModalOpen = signal(false);
  readonly reevalEmployee = signal<GroupedRow | null>(null);
  readonly reevalCourses = signal('');
  readonly isReevaluating = signal(false);
  readonly reevalSuccessData = signal<any>(null);
  /** Employees who already had re-evaluation triggered (prevents duplicates). */
  readonly reevaluatedIds = signal<Set<string>>(new Set());
  /** Loading state for report generation. */
  readonly generatingReportId = signal<string | null>(null);

  // Progress Modal State
  readonly isProgressModalOpen = signal(false);
  readonly progressData = signal<any[]>([]);
  readonly progressEmployee = signal<GroupedRow | null>(null);
  readonly isLoadingProgress = signal(false);

  private tourTimer?: ReturnType<typeof setTimeout>;

  readonly thClass =
    'px-6 py-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider';
  readonly thCenterClass = this.thClass + ' text-center';

  readonly doneBadgeClass =
    'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/20 gap-1 pl-2 font-bold text-[10px] transition-all';
  readonly pendingBadgeClass =
    'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border-red-200 dark:border-red-500/20 gap-1 pl-2 font-bold text-[10px] transition-all';
  readonly generatedBadgeClass =
    'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/20 gap-1 pl-2 font-bold text-[10px] transition-all ring-2 ring-indigo-500/20';
  readonly readyBadgeClass =
    'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/20 gap-1 pl-2 font-bold text-[10px] transition-all';
  readonly notReadyBadgeClass =
    'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 gap-1 pl-2 font-bold text-[10px] transition-all';

  ngOnInit(): void {
    this.loadAllData();

    if (!this.tour.hasSeen('reports')) {
      this.tourTimer = setTimeout(() => {
        this.tour.startTour(getTourSteps(this.i18n)['reports'], 'reports');
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.tourTimer) clearTimeout(this.tourTimer);
  }

  private loadAllData(): void {
    this.isLoading.set(true);
    // Neither stream errors — both swallow their own failures — so forkJoin
    // always reaches the subscriber.
    forkJoin([this.loadAssessments$(), this.loadManagersData$()])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isLoading.set(false));
  }

  loadAssessments(): void {
    this.loadAssessments$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private loadAssessments$(): Observable<void> {
    return this.assessmentService.getAllCompletedAssessments('all').pipe(
      map((result) => {
        const allAssessments: Assessment[] = result.assessments || [];
        this.groupAssessmentsByEmployee(allAssessments);
      }),
      catchError((error) => {
        console.error('Failed to load assessments:', error);
        return of(undefined);
      })
    );
  }

  loadManagersData(): void {
    this.loadManagersData$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private loadManagersData$(): Observable<void> {
    this.isManagersLoading.set(true);
    return this.managerAssessmentService.getManagersWithSubordinates().pipe(
      switchMap((managersList: any[]) =>
        managersList.length === 0
          ? of([])
          : forkJoin(
              managersList.map((mgr: any) =>
                this.managerAssessmentService.getManagerStatus(mgr.manager_id).pipe(
                  map((status) => ({ ...mgr, status })),
                  catchError((e) => {
                    console.error(
                      `Failed to load status for manager ${mgr.manager_id}`,
                      e
                    );
                    return of(mgr);
                  })
                )
              )
            )
      ),
      map((managersWithStatus) => {
        this.managers.set(managersWithStatus);
      }),
      catchError((error) => {
        console.error('Failed to load managers:', error);
        return of(undefined);
      }),
      finalize(() => this.isManagersLoading.set(false))
    );
  }

  private groupAssessmentsByEmployee(assessments: Assessment[]): void {
    const employeeMap = new Map<string, GroupedRow>();

    // Step 1: Group ALL assessments by employee key
    const allByKey = new Map<string, Assessment[]>();
    assessments.forEach((assessment) => {
      const orgName = assessment.organization_name || 'My Organization';
      const key = `${assessment.employee_national_id}_${assessment.job_title}_${orgName}`;
      if (!allByKey.has(key)) allByKey.set(key, []);
      allByKey.get(key)!.push(assessment);
    });

    // Step 2: For each employee, pick the latest technical & manager assessments
    allByKey.forEach((empAssessments, key) => {
      const first = empAssessments[0];
      const orgName = first.organization_name || 'My Organization';

      const grouped: GroupedRow = {
        employee_national_id: first.employee_national_id,
        employee_name: first.employee_name,
        job_title: first.job_title,
        department: first.department,
        organization_name: orgName,
        employee_assessment: null,
        manager_assessment: null,
        combined_report_id: null,
        sent_to_employee: false,
      };

      // Sort all assessments for this employee by date DESC
      const sorted = [...empAssessments].sort((a, b) => {
        const da = new Date(
          a.created_at || a.completed_at || a.assigned_at || 0
        ).getTime();
        const db = new Date(
          b.created_at || b.completed_at || b.assigned_at || 0
        ).getTime();
        return db - da;
      });

      // Check if any pending re-evaluation exists
      const hasPendingReevaluation = sorted.some((a) => {
        if (!a.is_reevaluation) return false;
        if (a.status !== 'pending') return false;
        // A manager assessment with no questions is auto-completed in the UI,
        // so it shouldn't count as pending here either.
        if (
          a.assessment_type === 'manager' &&
          Array.isArray(a.questions) &&
          a.questions.length === 0
        ) {
          return false;
        }
        return true;
      });

      // Pick the newest technical and manager assessments
      for (const a of sorted) {
        if (a.assessment_type === 'technical' && !grouped.employee_assessment) {
          grouped.employee_assessment = a;
        } else if (
          a.assessment_type === 'manager' &&
          !grouped.manager_assessment
        ) {
          grouped.manager_assessment = a;
        }
        if (grouped.employee_assessment && grouped.manager_assessment) break;
      }

      // Step 3: Determine report state
      grouped.hasPendingReevaluation = hasPendingReevaluation;

      // Use the report ID from whichever assessment has one (prefer technical)
      const techReportId = (grouped.employee_assessment as any)
        ?.combined_report_id;
      const mgrReportId = (grouped.manager_assessment as any)
        ?.combined_report_id;
      grouped.combined_report_id = techReportId || mgrReportId || null;
      grouped.sent_to_employee =
        (grouped.employee_assessment as any)?.sent_to_employee ||
        (grouped.manager_assessment as any)?.sent_to_employee ||
        false;

      // Extract all generated reports
      const reportsMap = new Map<string, any>();
      for (const a of sorted) {
        const anyA = a as any;
        if (anyA.combined_report_id && !reportsMap.has(anyA.combined_report_id)) {
          reportsMap.set(anyA.combined_report_id, {
            id: anyA.combined_report_id,
            sent: !!anyA.sent_to_employee,
            is_latest: reportsMap.size === 0,
            date: new Date(
              anyA.submitted_at || anyA.completed_at || anyA.created_at || 0
            ).getTime(),
          });
        }
      }
      grouped.all_reports = Array.from(reportsMap.values());

      employeeMap.set(key, grouped);
    });

    this.groupedEmployees.set(Array.from(employeeMap.values()));
  }

  handleViewProgress(employee: GroupedRow): void {
    this.progressEmployee.set(employee);
    this.isProgressModalOpen.set(true);
    this.isLoadingProgress.set(true);
    this.progressData.set([]);
    this.reportService
      .getEmployeeProgress(employee.employee_national_id)
      .pipe(
        finalize(() => this.isLoadingProgress.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.has_progress) {
            this.progressData.set(res.competencies);
          } else {
            this.toastService.toast(
              this.i18n.t(
                'common.not_enough_data',
                'لا توجد بيانات كافية للمقارنة (تتطلب وجود تقييمين على الأقل)'
              ),
              'error'
            );
            this.isProgressModalOpen.set(false);
          }
        },
        error: (e) => {
          console.error(e);
          this.toastService.toast(
            this.i18n.t('errors.generic_error', 'حدث خطأ غير معروف'),
            'error'
          );
          this.isProgressModalOpen.set(false);
        },
      });
  }

  handleGenerateReport(employee: GroupedRow): void {
    this.generatingReportId.set(employee.employee_national_id);
    this.reportService
      .generateCombinedReport(
        employee.employee_national_id,
        employee.job_title,
        employee.organization_name
      )
      .pipe(
        finalize(() => this.generatingReportId.set(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.toastService.toast(
              this.i18n.t(
                'reports.toasts.report_generated',
                'Employee report generated successfully! ✅'
              ),
              'success'
            );
            this.loadAssessments();
          }
        },
        error: (error) => {
          console.error('Error generating report:', error);
          this.toastService.toast(
            this.i18n.t('errors.generic_error', 'An error occurred'),
            'error'
          );
        },
      });
  }

  handleSendToEmployee(employee: GroupedRow, reportId?: string): void {
    const targetReportId = reportId || employee.combined_report_id;
    if (!targetReportId) return;

    this.reportService
      .sendReportToEmployee(
        targetReportId,
        employee.employee_national_id,
        employee.employee_name
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.toast(
            this.i18n.t(
              'reports.actions.sent_success',
              'Report sent to employee successfully'
            ),
            'success'
          );
          this.loadAssessments();
        },
        error: (error) => {
          console.error('Error sending report:', error);
          this.toastService.toast(
            this.i18n.t(
              'reports.actions.sent_failure',
              'Failed to send report'
            ),
            'error'
          );
        },
      });
  }

  openReeval(employee: GroupedRow): void {
    this.reevalEmployee.set(employee);
    this.isReevalModalOpen.set(true);
    this.reevalCourses.set('');
    this.reevalSuccessData.set(null);
    this.developmentService
      .getEmployeeCourses(employee.employee_national_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success && res.courses) {
            const completed = res.courses.filter(
              (c) => c.status === 'completed'
            );
            if (completed.length > 0) {
              this.reevalCourses.set(
                completed.map((c) => c.course_name).join(', ')
              );
            }
          }
        },
        error: (e) => console.error('Failed to pre-fill courses', e),
      });
  }

  handleReevaluateSubmit(): void {
    const reevalEmployee = this.reevalEmployee();
    if (!reevalEmployee || !this.reevalCourses().trim()) return;

    this.isReevaluating.set(true);
    this.reportService
      .reevaluateEmployee({
        employee_id: reevalEmployee.employee_national_id,
        new_courses: this.reevalCourses(),
        employee_name: reevalEmployee.employee_name,
        employee_national_id: reevalEmployee.employee_national_id,
        job_title: reevalEmployee.job_title,
        organization_name: reevalEmployee.organization_name,
        department: reevalEmployee.department,
      })
      .pipe(
        finalize(() => this.isReevaluating.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          if (result.status === 'success') {
            this.reevalSuccessData.set(result);
            // Mark this employee as re-evaluated to disable the button
            this.reevaluatedIds.update((prev) =>
              new Set(prev).add(reevalEmployee.employee_national_id)
            );
            this.loadAssessments(); // Reload in background for new statuses
          } else {
            this.toastService.toast(
              result.message ||
                this.i18n.t('errors.generic_error', 'حدث خطأ غير معروف'),
              'error'
            );
          }
        },
        error: (error: any) => {
          console.error('Error re-evaluating employee:', error);
          // Try to get the specific error message from the backend response
          const errorMessage =
            error.error?.detail ||
            error.error?.message ||
            error.message ||
            this.i18n.t('errors.generic_error', 'حدث خطأ غير معروف');

          this.toastService.toast(errorMessage, 'error');
        },
      });
  }

  handleViewReport(reportId: string): void {
    window.open(`/app/view-report?id=${reportId}`, '_blank');
  }

  handleManagerGenerateReport(managerId: string): void {
    this.managerAssessmentService
      .generateReport(managerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.toastService.toast(
              this.i18n.t(
                'reports.actions.manager_report_success',
                'Manager report generated successfully'
              ),
              'success'
            );
            this.loadManagersData();
            if (result.report_id) {
              window.open(`/app/view-report?id=${result.report_id}`, '_blank');
            }
          }
        },
        error: (error) => {
          console.error('Error generating manager report:', error);
          this.toastService.toast(
            this.i18n.t(
              'reports.actions.manager_report_failure',
              'Failed to generate manager report'
            ),
            'error'
          );
        },
      });
  }

  handleSendToSuperior(reportId: string | null): void {
    if (!reportId) return;
    this.managerAssessmentService
      .sendToSuperior(reportId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.toastService.toast(
              this.i18n.t(
                'reports.actions.superior_sent_success',
                'Report sent to superior successfully'
              ),
              'success'
            );
            this.loadManagersData();
          }
        },
        error: (error) => {
          console.error('Error sending to superior:', error);
          this.toastService.toast(
            this.i18n.t(
              'reports.actions.superior_sent_failure',
              'Failed to send report to superior'
            ),
            'error'
          );
        },
      });
  }

  handleViewResults(manager: ManagerStatus): void {
    this.selectedManager.set(manager);
    this.isModalOpen.set(true);
    this.isModalLoading.set(true);
    this.selectedEvaluationIdx.set(null);

    // Load questions if not loaded
    const questions$: Observable<any> =
      Object.keys(this.questionsMap()).length === 0
        ? this.managerAssessmentService.getQuestions().pipe(
            tap((qResult) => {
              if (qResult.success && qResult.questions) {
                const m: Record<number, any> = {};
                qResult.questions.forEach((q: any) => {
                  m[q.id] = q;
                });
                this.questionsMap.set(m);
              }
            })
          )
        : of(null);

    questions$
      .pipe(
        switchMap(() =>
          this.managerAssessmentService.getEvaluations(manager.manager_id)
        ),
        finalize(() => this.isModalLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.evaluations.set(result.evaluations);
          }
        },
        error: (error) => console.error('Error loading evaluations:', error),
      });
  }

  resetFilters(): void {
    this.departmentFilter.set('all');
    this.jobTitleFilter.set('all');
    this.statusFilter.set('all');
    this.searchTerm.set('');
  }

  // Filter Logic
  readonly filteredEmployees = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.groupedEmployees().filter((employee) => {
      // Search Term
      const searchMatch =
        (employee.employee_name || '').toLowerCase().includes(term) ||
        (employee.job_title || '').toLowerCase().includes(term);
      if (!searchMatch) return false;

      // Filters
      if (
        this.departmentFilter() !== 'all' &&
        employee.department !== this.departmentFilter()
      ) {
        return false;
      }
      if (
        this.jobTitleFilter() !== 'all' &&
        employee.job_title !== this.jobTitleFilter()
      ) {
        return false;
      }

      if (this.statusFilter() === 'generated' && !employee.combined_report_id) {
        return false;
      }
      if (this.statusFilter() === 'pending' && employee.combined_report_id) {
        return false;
      }

      return true;
    });
  });

  // Extract unique values for filters
  readonly departments = computed(() => [
    ...new Set(this.groupedEmployees().map((e) => e.department).filter(Boolean)),
  ]);

  readonly jobTitles = computed(() => [
    ...new Set(this.groupedEmployees().map((e) => e.job_title).filter(Boolean)),
  ]);

  // Statistics
  readonly reportsGenerated = computed(
    () => this.groupedEmployees().filter((e) => e.combined_report_id).length
  );

  /** Placeholder carried over from the legacy code. */
  private calculateAverageScore(): string {
    return '0%';
  }

  readonly statCards = computed<
    { title: string; value: string | number; icon: IconName; gradient: string }[]
  >(() => {
    const t = (key: string, fallback: string) => this.i18n.t(key, fallback);
    return [
      {
        title: t('reports.stats.total_employees', 'Total Employees'),
        value: this.groupedEmployees().length,
        icon: 'Users',
        gradient: 'from-purple-500 to-indigo-600',
      },
      {
        title: t('reports.stats.generated_reports', 'Generated Reports'),
        value: this.reportsGenerated(),
        icon: 'FileText',
        gradient: 'from-emerald-500 to-teal-600',
      },
      {
        title: t('reports.stats.avg_score', 'Average Score'),
        value: this.calculateAverageScore(),
        icon: 'RotateCcw',
        gradient: 'from-blue-400 to-cyan-500',
      },
      {
        title: t('reports.stats.pending', 'Pending'),
        value: this.groupedEmployees().length - this.reportsGenerated(),
        icon: 'Clock',
        gradient: 'from-amber-400 to-orange-500',
      },
    ];
  });

  empCompleted(employee: GroupedRow): boolean {
    return employee.employee_assessment?.status === 'completed';
  }

  mgrCompleted(employee: GroupedRow): boolean {
    return (
      employee.manager_assessment?.status === 'completed' ||
      (Array.isArray(employee.manager_assessment?.questions) &&
        employee.manager_assessment.questions.length === 0) ||
      !employee.manager_assessment
    );
  }

  bothCompleted(employee: GroupedRow): boolean {
    return this.empCompleted(employee) && this.mgrCompleted(employee);
  }

  isGenerating(employee: GroupedRow): boolean {
    return this.generatingReportId() === employee.employee_national_id;
  }

  isReevaluated(employee: GroupedRow): boolean {
    return this.reevaluatedIds().has(employee.employee_national_id);
  }

  reevalLabel(employee: GroupedRow): string {
    return this.isReevaluated(employee)
      ? this.i18n.t('reevaluation.already_triggered', 'تم إعادة التقييم')
      : this.i18n.t('reevaluation.button_label', 'إعادة تقييم');
  }

  reevalTitle(employee: GroupedRow): string {
    return this.isReevaluated(employee)
      ? this.i18n.t('reevaluation.already_triggered', 'تم إعادة التقييم بالفعل')
      : this.i18n.t('reevaluation.button_label', 'إعادة تقييم');
  }

  reevalButtonClass(employee: GroupedRow): string {
    return cn(
      'h-8 gap-1.5 px-3 rounded-lg shadow-sm font-bold transition-all text-[11px]',
      this.isReevaluated(employee)
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
        : 'bg-amber-500 hover:bg-amber-600 text-white hover:scale-105 active:scale-95'
    );
  }

  generateButtonClass(employee: GroupedRow, stacked: boolean): string {
    return cn(
      stacked ? 'mt-1 ' : '',
      'h-8 gap-2 px-3 text-white rounded-lg shadow-sm w-full font-bold transition-all',
      this.isGenerating(employee)
        ? 'bg-emerald-400 cursor-wait opacity-80'
        : 'bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 hover:scale-105 active:scale-95'
    );
  }

  superiorButtonClass(mgr: ManagerStatus): string {
    return `h-8 gap-1.5 text-white font-medium ${
      mgr.status?.sent_to_superior
        ? 'bg-slate-400 cursor-not-allowed opacity-70'
        : 'bg-emerald-500 hover:bg-emerald-600'
    }`;
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString(
      this.isRtl() ? 'ar-SA' : 'en-US'
    );
  }

  readonly selectedEvaluation = computed(() => {
    const idx = this.selectedEvaluationIdx();
    return idx === null ? null : this.evaluations()[idx];
  });

  readonly selectedAnswers = computed(() => {
    const evaluation = this.selectedEvaluation();
    if (!evaluation) return [];
    return Object.keys(evaluation.answers).map((qid_str) => {
      const qid = parseInt(qid_str.replace('q', ''));
      const answer = evaluation.answers[qid_str];
      const qInfo = this.questionsMap()[qid] || {
        text: `${this.i18n.t('common.question')} ${qid}`,
        type: 'unknown',
      };
      return { qid, answer, text: qInfo.text, type: qInfo.type };
    });
  });

  private likertIndex(value: unknown): number {
    return Math.max(1, Math.min(5, parseInt(String(value)) || 1)) - 1;
  }

  likertLabel(value: unknown): string {
    const [key, fallback] = LIKERT_KEYS[this.likertIndex(value)];
    return this.i18n.t(key, fallback);
  }

  likertClass(value: unknown): string {
    return `px-3 py-1 ${LIKERT_COLORS[this.likertIndex(value)]} border font-bold text-[10px]`;
  }

  respondentClass(idx: number): string {
    return `p-4 border-b border-slate-100 dark:border-white/5 cursor-pointer transition-all hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 flex items-center justify-between group flex-row-reverse text-right ${
      this.selectedEvaluationIdx() === idx
        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-r-4 border-r-indigo-600'
        : ''
    }`;
  }

  chevronClass(idx: number): string {
    return `w-4 h-4 text-slate-300 transition-transform ${
      this.selectedEvaluationIdx() === idx
        ? 'translate-x-1 text-indigo-600'
        : 'group-hover:translate-x-1'
    }`;
  }

  readonly progressChartData = computed(() => {
    const rows = this.progressData();
    return {
      labels: rows.map((r) => r.competency),
      datasets: [
        {
          label: this.isRtl() ? 'نتيجة التقييم القديم' : 'Old Score',
          data: rows.map((r) => r.old_score),
          backgroundColor: '#94a3b8',
          borderRadius: 6,
          barThickness: 35,
        },
        {
          label: this.isRtl() ? 'نتيجة التقييم الجديد' : 'New Score',
          data: rows.map((r) => r.new_score),
          backgroundColor: '#4f46e5',
          borderRadius: 6,
          barThickness: 35,
        },
      ],
    };
  });

  readonly progressChartOptions = {
    scales: {
      x: {
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          maxRotation: 35,
          minRotation: 35,
          autoSkip: false,
        },
        grid: { display: false },
      },
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#64748b', callback: (v: any) => `${v}%` },
        grid: { color: '#e2e8f0' },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { usePointStyle: true, padding: 20 },
      },
      tooltip: {
        cornerRadius: 12,
        padding: 12,
        borderColor: '#e2e8f0',
        borderWidth: 1,
        bodyFont: { weight: 'bold' as const },
      },
    },
  };

  readonly headerClass = computed(() =>
    cn('mb-6 sm:mb-8', this.isRtl() ? 'text-right' : 'text-left')
  );

  readonly headerRowClass = computed(() =>
    cn(
      'flex items-center gap-4 mb-2',
      this.isRtl() ? 'flex-row-reverse' : 'flex-row'
    )
  );

  statTopBarClass(gradient: string): string {
    return `absolute top-0 left-0 w-full h-1.5 bg-linear-to-r ${gradient} opacity-80`;
  }

  statIconClass(gradient: string): string {
    return `p-3.5 rounded-2xl bg-linear-to-br ${gradient} shadow-xl shadow-indigo-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`;
  }

  readonly progressDialogClass = computed(() =>
    cn(
      'max-w-4xl max-h-[90vh] overflow-y-auto',
      this.isRtl() ? 'rtl text-right' : 'ltr text-left'
    )
  );
}
