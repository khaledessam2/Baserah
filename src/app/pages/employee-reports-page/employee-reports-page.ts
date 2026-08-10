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
    return report.viewed_by_employee
      ? 'bg-green-500/10 text-green-600'
      : 'bg-amber-500/10 text-amber-600';
  }
}
