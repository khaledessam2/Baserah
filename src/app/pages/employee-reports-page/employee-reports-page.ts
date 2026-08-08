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
import { I18nService } from '@/services/i18n.service';
import { TourService } from '@/services/tour.service';
import { ReportService } from '@/services/report.service';
import type { Report } from '@/models/api.model';
import { getTourSteps } from '@/shared/config/tour-config';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';

interface ReportInfo {
  icon: IconName;
  label: string;
  value: string;
}

/** Port of `pages/EmployeeReportsPage.tsx`. */
@Component({
  selector: 'app-employee-reports-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, ...CARD_DIRECTIVES, Icon],
  templateUrl: './employee-reports-page.html',
})
export class EmployeeReportsPage implements OnInit, OnDestroy {
  private readonly i18n = inject(I18nService);
  private readonly tour = inject(TourService);
  private readonly reportService = inject(ReportService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly reports = signal<Report[]>([]);
  readonly isLoading = signal(true);

  private tourTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.fetchReports();

    if (!this.tour.hasSeen('employee-reports')) {
      this.tourTimer = setTimeout(() => {
        this.tour.startTour(
          getTourSteps(this.i18n)['employee-reports'],
          'employee-reports'
        );
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.tourTimer) clearTimeout(this.tourTimer);
  }

  private fetchReports(): void {
    this.reportService
      .getMyReports()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.reports.set(response.reports);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to fetch reports', error);
          this.isLoading.set(false);
        },
      });
  }

  reportInfo(report: Report): ReportInfo[] {
    return [
      {
        icon: 'Briefcase',
        label: 'المسمى الوظيفي',
        value: report.job_title || 'غير محدد',
      },
      {
        icon: 'Calendar',
        label: 'تاريخ التوليد',
        value: new Date(report.generated_at).toLocaleDateString('ar-SA'),
      },
      {
        icon: 'Send',
        label: 'تاريخ الإرسال',
        value: new Date(report.sent_at).toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      },
      {
        icon: 'Tag',
        label: 'نوع التقرير',
        value: report.type === 'combined' ? 'تقرير مجمع' : 'تقرير فردي',
      },
    ];
  }

  openReport(report: Report): void {
    window.open(`/app/view-report?id=${report.report_id}`, '_blank');
  }

  statusBadgeClass(report: Report): string {
    const isNew = !report.viewed_by_employee;
    return cn(
      'absolute top-4 px-3 py-1 rounded-full text-xs font-bold shadow-sm',
      isNew
        ? 'bg-amber-500/10 text-amber-600'
        : 'bg-green-500/10 text-green-600',
      this.isRtl() ? 'left-4' : 'right-4'
    );
  }

  readonly headerClass = computed(() =>
    cn(
      'bg-gradient-to-r from-primary to-secondary rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-primary-foreground shadow-2xl shadow-primary/20 animate-in fade-in-0 slide-in-from-top-2 duration-500',
      this.isRtl() ? 'text-right' : 'text-left'
    )
  );

  readonly headerRowClass = computed(() =>
    cn(
      'flex items-center gap-4 sm:gap-6',
      this.isRtl() ? 'flex-row-reverse' : 'flex-row'
    )
  );

  readonly cardTitleClass = computed(() =>
    cn('text-xl font-bold text-foreground mb-1', this.isRtl() && 'text-right')
  );

  readonly infoListClass = computed(() =>
    cn('space-y-4', this.isRtl() && 'text-right')
  );

  readonly infoRowClass = computed(() =>
    cn('flex items-start gap-3 text-sm', this.isRtl() && 'flex-row-reverse')
  );

  readonly eyeIconClass = computed(() =>
    cn(
      'w-5 h-5 group-hover:scale-110 transition-transform',
      this.isRtl() ? 'ml-2' : 'mr-2'
    )
  );
}
