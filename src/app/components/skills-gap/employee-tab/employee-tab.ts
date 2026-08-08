import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, Subject, catchError, switchMap } from 'rxjs';
import { I18nService } from '@/services/i18n.service';
import { SkillsGapService } from '@/services/skills-gap.service';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { ChartComponent } from '@/shared/components/chart/chart';
import { InputDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { GapBadge } from '../gap-badge/gap-badge';
import { ScoreBar } from '../score-bar/score-bar';
import { SkillsGapRoundCard } from '../skills-gap-round-card/skills-gap-round-card';
import { formatDate } from '@/shared/utils/format-date';
import type { ProfileData } from '@/models/skills-gap.model';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `skills-gap/EmployeeTab.tsx`. */
@Component({
  selector: 'app-skills-gap-employee-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonDirective,
    ...CARD_DIRECTIVES,
    ChartComponent,
    InputDirective,
    Icon,
    GapBadge,
    ScoreBar,
    SkillsGapRoundCard,
    TranslatePipe,
  ],
  templateUrl: './employee-tab.html',
})
export class SkillsGapEmployeeTab {
  /** Unused by the endpoint, kept for parity with the React signature. */
  readonly orgName = input<string | undefined>(undefined);

  private readonly i18n = inject(I18nService);
  private readonly skillsGapService = inject(SkillsGapService);

  readonly locale = computed(() => this.i18n.language());

  readonly nationalId = signal('');
  readonly data = signal<ProfileData | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  /** `switchMap` drops the response of a search the user already replaced. */
  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        switchMap((nationalId) =>
          // Caught inside switchMap so a failed search does not tear down the
          // outer subscription and leave the button dead.
          this.skillsGapService.getEmployeeGap(nationalId).pipe(
            catchError((e: any) => {
              this.error.set(
                e.message ||
                  this.i18n.t('skills_gap.employee_profile.error_occurred')
              );
              this.loading.set(false);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe((r) => {
        if (r.data) this.data.set(r.data);
        else {
          this.error.set(
            r.message || this.i18n.t('skills_gap.employee_profile.no_data')
          );
        }
        this.loading.set(false);
      });
  }

  load(): void {
    const nationalId = this.nationalId().trim();
    if (!nationalId) return;
    this.loading.set(true);
    this.error.set('');
    this.data.set(null);
    this.search$.next(nationalId);
  }

  fmtDate(d: string): string {
    return formatDate(d, this.locale());
  }

  readonly trainingGaps = computed(() =>
    (this.data()?.competency_gaps || [])
      .filter((g) => g.gap > 0)
      .sort((a, b) => b.gap - a.gap)
  );

  readonly radarData = computed(() => {
    const gaps = this.data()?.competency_gaps || [];
    return {
      labels: gaps.map((g) =>
        g.competency.length > 14
          ? g.competency.substring(0, 14) + '…'
          : g.competency
      ),
      datasets: [
        {
          label: this.i18n.t('skills_gap.role.required_level'),
          data: gaps.map(() => 100),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.08)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 3,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
        },
        {
          label: this.i18n.t('skills_gap.role.actual_level'),
          data: gaps.map((g) => g.score),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.25)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
      ],
    };
  });

  readonly radarOptions = {
    scales: {
      r: {
        min: 0,
        max: 100,
        angleLines: { color: 'rgba(148,163,184,0.2)' },
        grid: { color: 'rgba(148,163,184,0.2)' },
        pointLabels: { color: '#94a3b8', font: { size: 9, weight: 600 } },
        ticks: {
          color: '#64748b',
          font: { size: 9 },
          backdropColor: 'transparent',
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { usePointStyle: true, font: { size: 11 }, padding: 8 },
      },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 10,
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
      },
    },
  };

  ringColor(score: number): string {
    return score >= 60 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  }

  ringDash(score: number): string {
    return `${(score / 100) * 220} 220`;
  }

  mgrScoreClass(score: number | null): string {
    return cn(
      'text-2xl font-black',
      score !== null
        ? score >= 60
          ? 'text-emerald-400'
          : 'text-amber-400'
        : 'text-slate-500'
    );
  }

  improvementClass(improved: boolean): string {
    return cn(
      'text-2xl font-black',
      improved ? 'text-emerald-400' : 'text-red-400'
    );
  }

  trainingBadgeClass(severity: string): string {
    return cn(
      'w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0',
      severity === 'critical'
        ? 'bg-red-500'
        : severity === 'medium'
        ? 'bg-amber-500'
        : 'bg-blue-500'
    );
  }

  trainingLabel(severity: string): string {
    if (severity === 'critical') {
      return this.i18n.t('skills_gap.employee_profile.training_critical');
    }
    if (severity === 'medium') {
      return this.i18n.t('skills_gap.employee_profile.training_medium');
    }
    return this.i18n.t('skills_gap.employee_profile.training_low');
  }

  directionCircleClass(direction: string): string {
    return cn(
      'w-14 h-14 rounded-full flex items-center justify-center shadow-lg',
      direction === 'improved'
        ? 'bg-emerald-500 shadow-emerald-500/30'
        : direction === 'declined'
        ? 'bg-red-500 shadow-red-500/30'
        : 'bg-slate-400'
    );
  }

  changeTextClass(change: number): string {
    return cn(
      'text-sm font-black',
      change > 0
        ? 'text-emerald-500'
        : change < 0
        ? 'text-red-500'
        : 'text-slate-400'
    );
  }

  changeIndicatorClass(change: number): string {
    return cn(
      'inline-flex items-center gap-0.5 font-bold text-sm',
      change > 0
        ? 'text-emerald-500'
        : change < 0
        ? 'text-red-500'
        : 'text-slate-400'
    );
  }

  historyScoreClass(isLatest: boolean): string {
    return cn(
      'text-sm font-black',
      isLatest ? 'text-indigo-500' : 'text-slate-600 dark:text-slate-300'
    );
  }

  historyBarClass(isLatest: boolean): string {
    return cn(
      'absolute bottom-0 w-full rounded-t-xl transition-all duration-700',
      isLatest
        ? 'bg-gradient-to-t from-indigo-600 to-purple-500'
        : 'bg-gradient-to-t from-slate-400 to-slate-300 dark:from-slate-600 dark:to-slate-500'
    );
  }
}
