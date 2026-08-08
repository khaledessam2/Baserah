import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, catchError, finalize, switchMap } from 'rxjs';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { ToastService } from '@/services/toast.service';
import { DevelopmentService } from '@/services/development.service';
import type { CourseSuggestion } from '@/models/development.model';
import { ReportService } from '@/services/report.service';
import type { Report } from '@/models/api.model';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import {
  Dialog,
  DialogDescriptionDirective,
  DialogFooterDirective,
  DialogHeaderDirective,
  DialogTitleDirective,
} from '@/shared/components/dialog';
import {
  BadgeDirective,
  InputDirective,
  LabelDirective,
} from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `pages/ViewReportPage.tsx`. */
@Component({
  selector: 'app-view-report-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonDirective,
    ...CARD_DIRECTIVES,
    Dialog,
    DialogHeaderDirective,
    DialogTitleDirective,
    DialogDescriptionDirective,
    DialogFooterDirective,
    BadgeDirective,
    InputDirective,
    LabelDirective,
    Icon,
    TranslatePipe,
  ],
  templateUrl: './view-report-page.html',
})
export class ViewReportPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  private readonly toastService = inject(ToastService);
  private readonly reportService = inject(ReportService);
  private readonly developmentService = inject(DevelopmentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly report = signal<Report | null>(null);
  readonly isLoading = signal(true);

  // Already-assigned courses (for dedup)
  readonly assignedCourseNames = signal<string[]>([]);

  // Development Plan Modal State
  readonly isAssignModalOpen = signal(false);
  readonly courseName = signal('');
  readonly courseReason = signal('');
  readonly isAssigning = signal(false);

  // AI Suggestions State
  readonly aiSuggestions = signal<CourseSuggestion[]>([]);
  readonly isLoadingSuggestions = signal(false);
  readonly suggestionsError = signal(false);
  readonly hasFetchedSuggestions = signal(false);

  private reportId: string | null = null;

  constructor() {
    // Fetch AI suggestions when modal opens
    effect(() => {
      const report = this.report();
      if (
        this.isAssignModalOpen() &&
        report?.content &&
        !this.hasFetchedSuggestions()
      ) {
        this.isLoadingSuggestions.set(true);
        this.suggestionsError.set(false);
        this.developmentService
          .suggestCourses(report.content)
          .pipe(
            finalize(() => {
              this.isLoadingSuggestions.set(false);
              this.hasFetchedSuggestions.set(true);
            }),
            takeUntilDestroyed(this.destroyRef)
          )
          .subscribe({
            next: (res) => {
              if (res.success && res.suggestions) {
                this.aiSuggestions.set(res.suggestions);
              }
            },
            error: () => this.suggestionsError.set(true),
          });
      }
    });
  }

  ngOnInit(): void {
    this.reportId = this.route.snapshot.queryParamMap.get('id');
    if (!this.reportId) {
      this.toastService.toast(this.i18n.t('view_report.no_id'), 'error');
      this.router.navigate(['/app/employee-reports']);
      return;
    }
    this.fetchReport(this.reportId);
  }

  private fetchReport(reportId: string): void {
    this.reportService
      .getReportById(reportId)
      .pipe(
        switchMap((response) => {
          if (!response.success || !response.report) {
            this.toastService.toast(
              this.i18n.t('view_report.load_failed'),
              'error'
            );
            return EMPTY;
          }

          this.report.set(response.report);
          // Fetch already-assigned courses for this employee. A failure here
          // must not surface as a report-load error.
          return this.developmentService
            .getEmployeeCourses(response.report.employee_national_id)
            .pipe(
              catchError((e) => {
                console.error('Failed to fetch existing courses', e);
                return EMPTY;
              })
            );
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (coursesRes) => {
          if (coursesRes.success && coursesRes.courses) {
            this.assignedCourseNames.set(
              coursesRes.courses.map((c) => c.course_name)
            );
          }
        },
        error: (error) => {
          console.error('Failed to fetch report', error);
          this.toastService.toast(
            this.i18n.t('view_report.load_error'),
            'error'
          );
        },
      });
  }

  backToReports(): void {
    this.router.navigate(['/app/employee-reports']);
  }

  handlePrint(): void {
    window.print();
  }

  isAlreadyAssigned(name: string): boolean {
    return this.assignedCourseNames().some(
      (n) => n.toLowerCase() === name.toLowerCase()
    );
  }

  pickSuggestion(s: CourseSuggestion): void {
    if (this.isAlreadyAssigned(s.course_name)) return;
    this.courseName.set(s.course_name);
    this.courseReason.set(s.reason);
  }

  handleAssignCourse(): void {
    const report = this.report();
    if (!this.courseName().trim() || !report) return;
    // Prevent duplicate assignment
    if (this.isAlreadyAssigned(this.courseName().trim())) {
      this.toastService.toast(
        this.i18n.t('development_plan.already_assigned', 'هذه الدورة معينة بالفعل'),
        'error'
      );
      return;
    }
    this.isAssigning.set(true);
    this.developmentService
      .addCourse({
        employee_national_id: report.employee_national_id,
        report_id: report.report_id || this.reportId!,
        course_name: this.courseName().trim(),
        reason: this.courseReason().trim(),
      })
      .pipe(
        finalize(() => this.isAssigning.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.toast(
              this.i18n.t(
                'development_plan.assign_success',
                'تم تعيين الدورة بنجاح'
              ),
              'success'
            );
            this.assignedCourseNames.update((prev) => [
              ...prev,
              this.courseName().trim(),
            ]);
            this.courseName.set('');
            this.courseReason.set('');
            this.isAssignModalOpen.set(false);
          }
        },
        error: () =>
          this.toastService.toast(
            this.i18n.t('errors.generic_error', 'حدث خطأ غير معروف'),
            'error'
          ),
      });
  }

  /**
   * Simple markdown-to-HTML parser for basic formatting.
   *
   * Bound with plain `[innerHTML]` rather than a sanitizer bypass — Angular's
   * HTML sanitizer keeps the headings, emphasis, list items and their `class`
   * attributes, and strips anything script-like out of backend-authored text.
   */
  readonly renderedContent = computed(() => {
    const rawContent: unknown = this.report()?.content;
    if (!rawContent) return '';

    let content: string;
    if (typeof rawContent === 'string') {
      content = rawContent;
    } else if (
      typeof rawContent === 'object' &&
      rawContent !== null &&
      'report_text' in rawContent
    ) {
      content = (rawContent as any).report_text;
    } else {
      content = JSON.stringify(rawContent);
    }

    const listIndent = this.isRtl() ? 'mr-4' : 'ml-4';

    return content
      .replace(
        /^### (.*$)/gim,
        '<h3 class="text-xl font-bold mt-6 mb-3 text-primary">$1</h3>'
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 class="text-2xl font-bold mt-8 mb-4 text-primary border-b border-border pb-2">$1</h2>'
      )
      .replace(
        /^# (.*$)/gim,
        '<h1 class="text-3xl font-black mt-10 mb-6 text-foreground border-b-2 border-border pb-3">$1</h1>'
      )
      .replace(
        /\*\*(.*)\*\*/gim,
        '<strong class="font-bold text-foreground">$1</strong>'
      )
      .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
      .replace(
        /^\- (.*$)/gim,
        `<li class="${listIndent} list-disc opacity-90">$1</li>`
      )
      .replace(
        /^\* (.*$)/gim,
        `<li class="${listIndent} list-disc opacity-90">$1</li>`
      )
      .replace(/\n/gim, '<br />');
  });

  readonly reportTypeLabel = computed(() => {
    const rep = this.report();
    if (!rep) return '';
    if (rep.type === 'combined') return this.i18n.t('view_report.combined_report');
    if ((rep.type as string) === 'manager_performance_360') {
      return this.i18n.t(
        'view_report.manager_report',
        'MANAGER ASSESSMENT REPORT'
      );
    }
    return this.i18n.t('view_report.individual_report');
  });

  readonly headerName = computed(() => {
    const rep = this.report();
    if (!rep) return '';
    return (
      rep.employee_name ||
      (typeof rep.content === 'object' && (rep.content as any)?.manager_name) ||
      ''
    );
  });

  readonly headerJobTitle = computed(() => {
    const rep = this.report();
    if (!rep) return '';
    return (
      rep.job_title ||
      (typeof rep.content === 'object' && (rep.content as any)?.manager_title) ||
      ''
    );
  });

  readonly generatedDate = computed(() => {
    const rep = this.report();
    return rep?.generated_at
      ? new Date(rep.generated_at).toLocaleDateString(
          this.isRtl() ? 'ar-SA' : 'en-US'
        )
      : 'N/A';
  });

  readonly rootClass = computed(() =>
    cn('min-h-screen bg-background pb-20', this.isRtl() && 'rtl')
  );

  readonly headerBlobTopClass = computed(() =>
    cn(
      'absolute top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 blur-3xl',
      this.isRtl() ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'
    )
  );

  readonly headerBlobBottomClass = computed(() =>
    cn(
      'absolute bottom-0 w-96 h-96 bg-purple-500/10 rounded-full translate-y-1/2 blur-3xl',
      this.isRtl() ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
    )
  );

  readonly fieldClass = computed(() =>
    cn('space-y-2', this.isRtl() ? 'text-right' : 'text-left')
  );

  readonly labelClass = computed(() =>
    cn('flex items-center gap-2', this.isRtl() ? 'font-cairo' : '')
  );

  suggestionClass(s: CourseSuggestion): string {
    const already = this.isAlreadyAssigned(s.course_name);
    return cn(
      'w-full p-3 rounded-xl border text-sm transition-all duration-200 text-right',
      already
        ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10 opacity-60 cursor-not-allowed'
        : this.courseName() === s.course_name
        ? 'border-primary bg-primary/5 shadow-sm'
        : 'border-border hover:border-primary/30 hover:bg-muted/30'
    );
  }
}
