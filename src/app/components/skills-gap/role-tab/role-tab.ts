import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@/services/i18n.service';
import { SkillsGapService } from '@/services/skills-gap.service';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { ChartComponent } from '@/shared/components/chart/chart';
import { Icon } from '@/shared/components/icon/icon';
import { SELECT_DIRECTIVES } from '@/shared/components/select';
import { GapBadge } from '../gap-badge/gap-badge';
import { ScoreBar } from '../score-bar/score-bar';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

const DARK_TOOLTIP = {
  backgroundColor: 'rgba(15,23,42,0.95)',
  borderColor: 'rgba(255,255,255,0.1)',
  borderWidth: 1,
  cornerRadius: 12,
  padding: 10,
  titleColor: '#e2e8f0',
  bodyColor: '#e2e8f0',
};

/** Port of `skills-gap/RoleTab.tsx`. */
@Component({
  selector: 'app-skills-gap-role-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ...CARD_DIRECTIVES,
    ChartComponent,
    Icon,
    ...SELECT_DIRECTIVES,
    GapBadge,
    ScoreBar,
    TranslatePipe,
  ],
  templateUrl: './role-tab.html',
})
export class SkillsGapRoleTab {
  readonly orgName = input<string | undefined>(undefined);
  readonly jobTitles = input.required<string[]>();

  private readonly i18n = inject(I18nService);
  private readonly skillsGapService = inject(SkillsGapService);

  readonly selected = signal('');
  readonly data = signal<any>(null);
  readonly loading = signal(false);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      this.orgName();
      if (this.selected()) this.load();
    });
  }

  private load(): void {
    this.loading.set(true);
    this.skillsGapService
      .getRoleGap(this.selected(), this.orgName())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.data.set(r.data);
          this.loading.set(false);
        },
        error: (e) => {
          console.error(e);
          this.loading.set(false);
        },
      });
  }

  // Prepare grouped bar chart data: Required (100%) vs Actual (avg_score)
  readonly barData = computed(() =>
    (this.data()?.competency_summary || []).map((c: any) => ({
      name:
        c.competency.length > 14
          ? c.competency.substring(0, 14) + '…'
          : c.competency,
      fullName: c.competency,
      actual: c.avg_score,
      required: 100,
      gap: c.avg_gap,
    }))
  );

  readonly radarData = computed(() => {
    const rows: any[] = this.data()?.radar_data || [];
    return {
      labels: rows.map((r) => r.competency),
      datasets: [
        {
          label: this.i18n.t('skills_gap.role.required_level'),
          data: rows.map((r) => r.fullMark),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 3,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
        },
        {
          label: this.i18n.t('skills_gap.role.actual_level'),
          data: rows.map((r) => r.score),
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

  readonly requiredVsActualData = computed(() => {
    const rows = this.barData();
    return {
      labels: rows.map((r: any) => r.name),
      datasets: [
        {
          label: this.i18n.t('skills_gap.role.required_level'),
          data: rows.map((r: any) => r.required),
          backgroundColor: 'rgba(16,185,129,0.3)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 4,
          barThickness: 12,
        },
        {
          label: this.i18n.t('skills_gap.role.actual_level'),
          data: rows.map((r: any) => r.actual),
          backgroundColor: rows.map((r: any) =>
            r.actual >= 70 ? '#6366f1' : r.actual >= 40 ? '#eab308' : '#ef4444'
          ),
          borderRadius: 4,
          barThickness: 12,
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
        pointLabels: { color: '#94a3b8', font: { size: 10, weight: 600 } },
        ticks: { color: '#64748b', font: { size: 9 }, backdropColor: 'transparent' },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { usePointStyle: true, font: { size: 11 }, padding: 8 },
      },
      tooltip: DARK_TOOLTIP,
    },
  };

  readonly groupedBarOptions = {
    indexAxis: 'y' as const,
    scales: {
      x: {
        min: 0,
        max: 100,
        ticks: {
          color: '#94a3b8',
          font: { size: 10 },
          callback: (v: any) => `${v}%`,
        },
        grid: { color: 'rgba(148,163,184,0.12)' },
        border: { display: false },
      },
      y: {
        ticks: { color: '#cbd5e1', font: { size: 10, weight: 600 } },
        grid: { display: false },
        border: { display: false },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { font: { size: 11 }, padding: 8 },
      },
      tooltip: DARK_TOOLTIP,
    },
  };

  avgScoreClass(score: number): string {
    if (score >= 60) return 'text-emerald-500';
    return score >= 40 ? 'text-amber-500' : 'text-red-500';
  }

  benchIconClass(bench: number): string {
    return bench >= 50
      ? 'from-emerald-500 to-green-600 shadow-emerald-500/25'
      : 'from-amber-500 to-orange-600 shadow-amber-500/25';
  }

  benchValueClass(bench: number): string {
    return bench >= 50 ? 'text-emerald-500' : 'text-amber-500';
  }

  scoreCellClass(score: number): string {
    if (score >= 60) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20';
    if (score >= 40) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/20';
    return 'text-red-600 bg-red-50 dark:bg-red-950/20';
  }
}
