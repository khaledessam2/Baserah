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
import { Router } from '@angular/router';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { TourService } from '@/services/tour.service';
import { AuthApi } from '@/services/auth.api';
import { DevelopmentService } from '@/services/development.service';
import type { DevelopmentCourse, EmployeeProfile } from '@/models/api.model';
import { getTourSteps } from '@/shared/config/tour-config';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { ConfirmationModal } from '@/shared/components/confirmation-modal/confirmation-modal';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

interface DashboardCard {
  title: string;
  description: string;
  icon: IconName;
  color: string;
  route?: string;
  tourAttr?: string;
}

interface InfoRow {
  label: string;
  value?: string;
  icon: IconName;
}

/** Port of `pages/EmployeeDashboardPage.tsx`. */
@Component({
  selector: 'app-employee-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonDirective,
    ...CARD_DIRECTIVES,
    ConfirmationModal,
    Icon,
    TranslatePipe,
  ],
  templateUrl: './employee-dashboard-page.html',
})
export class EmployeeDashboardPage implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly tour = inject(TourService);
  private readonly authApi = inject(AuthApi);
  private readonly developmentService = inject(DevelopmentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<EmployeeProfile | null>(null);
  readonly isLoading = signal(true);
  readonly courses = signal<DevelopmentCourse[]>([]);
  readonly isLoadingCourses = signal(true);
  readonly courseToComplete = signal<string | null>(null);

  private readonly isRtl = computed(() => this.i18n.language() === 'ar');
  private tourTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.fetchProfile();

    if (this.auth.user()?.national_id) {
      this.fetchCourses();
    } else {
      this.isLoadingCourses.set(false);
    }

    if (!this.tour.hasSeen('employee-dashboard')) {
      this.tourTimer = setTimeout(() => {
        this.tour.startTour(
          getTourSteps(this.i18n)['employee-dashboard'],
          'employee-dashboard'
        );
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.tourTimer) clearTimeout(this.tourTimer);
  }

  private fetchProfile(): void {
    this.authApi
      .getEmployeeProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.employee) {
            this.profile.set(response.employee);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to fetch employee profile', error);
          this.isLoading.set(false);
        },
      });
  }

  private fetchCourses(): void {
    const nationalId = this.auth.user()?.national_id;
    if (!nationalId) return;
    this.developmentService
      .getEmployeeCourses(nationalId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.courses.set(response.courses);
          }
          this.isLoadingCourses.set(false);
        },
        error: (error) => {
          console.error('Failed to fetch development courses', error);
          this.isLoadingCourses.set(false);
        },
      });
  }

  completeCourse(): void {
    const courseId = this.courseToComplete();
    if (!courseId) return;
    this.developmentService
      .markAsCompleted(courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.courses.update((prev) =>
              prev.map((c) =>
                c._id === courseId ? { ...c, status: 'completed' as const } : c
              )
            );
          }
        },
        error: () =>
          alert(this.i18n.t('errors.generic_error', 'حدث خطأ غير معروف')),
      });
  }

  readonly dashboardCards = computed<DashboardCard[]>(() => {
    const t = (key: string, fallback?: string) => this.i18n.t(key, fallback);
    return [
      {
        title: t('employee_dashboard.nav_profile', 'My Profile'),
        description: t(
          'employee_dashboard.profile_desc',
          'View and review your profile data'
        ),
        icon: 'UserCircle',
        color: 'bg-blue-100 text-blue-600',
      },
      {
        title: t('analyzer.job_desc_label'),
        description: t(
          'employee_dashboard.jd_desc',
          'View your job description and responsibilities'
        ),
        icon: 'FileText',
        color: 'bg-indigo-100 text-indigo-600',
      },
      {
        title: t('competencies.title'),
        description: t(
          'employee_dashboard.competencies_desc',
          'Competencies and skills required for your job'
        ),
        icon: 'Star',
        color: 'bg-purple-100 text-purple-600',
      },
      {
        title: t('kpis.title'),
        description: t(
          'employee_dashboard.kpi_desc',
          'Key Performance Indicators for your job'
        ),
        icon: 'TrendingUp',
        color: 'bg-green-100 text-green-600',
      },
      {
        title: t('nav.assessments', 'Assessments'),
        description: t(
          'employee_dashboard.assessments_desc',
          'View and answer assessments sent to you'
        ),
        icon: 'ClipboardList',
        color: 'bg-orange-100 text-orange-600',
        route: '/app/employee-assessments',
        tourAttr: 'assessments-card',
      },
      {
        title: t('nav.reports', 'Reports'),
        description: t(
          'employee_dashboard.reports_desc',
          'View your performance and assessment reports'
        ),
        icon: 'FileText',
        color: 'bg-red-100 text-red-600',
        route: '/app/employee-reports',
        tourAttr: 'reports-card',
      },
      {
        title: t('employee_dashboard.nav_docs', 'Documents'),
        description: t(
          'employee_dashboard.docs_desc',
          'Files and documents related to your job'
        ),
        icon: 'Folder',
        color: 'bg-cyan-100 text-cyan-600',
      },
      {
        title: t('employee_dashboard.nav_support', 'Support'),
        description: t('employee_dashboard.support_desc', 'Contact the HR team'),
        icon: 'Headset',
        color: 'bg-emerald-100 text-emerald-600',
      },
    ];
  });

  runCardAction(card: DashboardCard): void {
    if (card.route) {
      this.router.navigate([card.route]);
      return;
    }
    alert(this.i18n.t('common.coming_soon'));
  }

  cardIconClass(card: DashboardCard): string {
    return cn(
      'w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 bg-primary/10 text-primary',
      // The palette classes are darkened for dark mode the same way the React
      // component did, by rewriting the tint suffixes.
      card.color
        .replace('100', '100 dark:bg-opacity-10')
        .replace('600', '600 dark:text-opacity-90')
    );
  }

  readonly infoRows = computed<InfoRow[]>(() => {
    const profile = this.profile();
    const user = this.auth.user();
    const t = (key: string, fallback?: string) => this.i18n.t(key, fallback);

    return [
      {
        label: t('employee_dashboard.full_name', 'Full Name'),
        value:
          profile?.الاسم_الكامل && profile.الاسم_الكامل !== 'غير متوفر'
            ? profile.الاسم_الكامل
            : user?.full_name,
        icon: 'User',
      },
      {
        label: t('employee_dashboard.id_number', 'ID Number'),
        value:
          profile?.رقم_الهوية && profile.رقم_الهوية !== 'غير متوفر'
            ? profile.رقم_الهوية
            : user?.national_id || user?.email,
        icon: 'CreditCard',
      },
      {
        label: t('analyzer.job_title_label'),
        value: profile?.المسمى_الوظيفي,
        icon: 'Briefcase',
      },
      {
        label: t('employee_dashboard.department', 'Department'),
        value: profile?.القسم,
        icon: 'Building',
      },
      {
        label: t('common.email'),
        value: profile?.البريد_الإلكتروني || user?.email,
        icon: 'Mail',
      },
      {
        label: t('employee_dashboard.join_date', 'Join Date'),
        value: profile?.تاريخ_الانضمام,
        icon: 'Calendar',
      },
    ];
  });

  readonly headerRowClass = computed(() =>
    cn(
      'flex items-center gap-4 sm:gap-6',
      this.isRtl() ? 'flex-row-reverse' : 'flex-row'
    )
  );

  readonly headerTextClass = computed(() =>
    cn(
      'space-y-1 sm:space-y-2 flex-1',
      this.isRtl() ? 'text-right' : 'text-left'
    )
  );
}
