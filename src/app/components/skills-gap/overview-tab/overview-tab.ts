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
import { catchError, forkJoin, of } from 'rxjs';
import { I18nService } from '@/services/i18n.service';
import { SkillsGapService } from '@/services/skills-gap.service';
import type { EmployeeGap } from '@/models/skills-gap.model';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { ChartComponent } from '@/shared/components/chart/chart';
import { Icon } from '@/shared/components/icon/icon';
import { GapBadge } from '../gap-badge/gap-badge';
import { GapStatCard } from '../gap-stat-card/gap-stat-card';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  medium: '#f59e0b',
  low: '#6366f1',
  strength: '#10b981',
};

const DEPT_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a78bfa',
  '#c4b5fd',
  '#818cf8',
  '#4f46e5',
  '#7c3aed',
  '#5b21b6',
];

/** Shared Chart.js styling standing in for the recharts tooltip/axis props. */
const DARK_TOOLTIP = {
  backgroundColor: 'rgba(15,23,42,0.95)',
  borderColor: 'rgba(255,255,255,0.1)',
  borderWidth: 1,
  cornerRadius: 12,
  padding: 10,
  titleColor: '#e2e8f0',
  bodyColor: '#e2e8f0',
};

/** Port of `skills-gap/OverviewTab.tsx`. */
@Component({
  selector: 'app-skills-gap-overview-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ...CARD_DIRECTIVES,
    ChartComponent,
    Icon,
    GapBadge,
    GapStatCard,
    TranslatePipe,
  ],
  templateUrl: './overview-tab.html',
})
export class SkillsGapOverviewTab {
  readonly orgName = input<string | undefined>(undefined);

  private readonly i18n = inject(I18nService);
  private readonly skillsGapService = inject(SkillsGapService);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly data = signal<any>(null);
  readonly trend = signal<any[]>([]);
  readonly loading = signal(true);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      this.orgName();
      this.load();
    });
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      overview: this.skillsGapService.getOverview(this.orgName()),
      trendRes: this.skillsGapService
        .getTrend(this.orgName())
        .pipe(catchError(() => of({ data: { trend: [] } }))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ overview, trendRes }) => {
          this.data.set(overview.data);
          this.trend.set(trendRes.data?.trend || []);
          this.loading.set(false);
        },
        error: (e) => {
          console.error(e);
          this.loading.set(false);
        },
      });
  }

  readonly sev = computed<Record<string, number>>(
    () => this.data()?.severity_distribution || {}
  );

  readonly totalSev = computed(() => {
    const sev = this.sev();
    return (
      (sev['critical'] || 0) +
      (sev['medium'] || 0) +
      (sev['low'] || 0) +
      (sev['strength'] || 0)
    );
  });

  readonly skillCoverage = computed(() =>
    this.data()?.avg_score > 0 ? this.data().avg_score : 0
  );

  readonly avgScoreSubtitle = computed(() => {
    const avg = this.data()?.avg_score ?? 0;
    if (avg >= 70) return this.i18n.t('skills_gap.overview.good_perf');
    if (avg >= 50) return this.i18n.t('skills_gap.overview.needs_improvement');
    return this.i18n.t('skills_gap.overview.poor_perf');
  });

  readonly severitySegments = computed(() => {
    const total = this.totalSev();
    if (total === 0) return [];
    const sev = this.sev();
    return (
      [
        { key: 'critical', color: 'bg-red-500' },
        { key: 'medium', color: 'bg-amber-500' },
        { key: 'low', color: 'bg-indigo-500' },
        { key: 'strength', color: 'bg-emerald-500' },
      ] as const
    )
      .map((s) => ({
        key: s.key,
        color: s.color,
        pct: Math.round(((sev[s.key] || 0) / total) * 100),
      }))
      .filter((s) => s.pct !== 0);
  });

  readonly topEmployees = computed<EmployeeGap[]>(() =>
    (this.data()?.employees || []).slice(0, 10)
  );

  readonly topNLabel = computed(() =>
    this.i18n.t('skills_gap.overview.top_n', {
      n: Math.min((this.data()?.employees || []).length, 10),
    })
  );

  private truncate(value: string, max: number): string {
    return value.length > max ? value.substring(0, max) + '…' : value;
  }

  private getBarColor(gap: number): string {
    if (gap >= 60) return '#ef4444';
    if (gap >= 40) return '#f97316';
    if (gap >= 20) return '#eab308';
    return '#22c55e';
  }

  readonly barChartData = computed(() =>
    (this.data()?.top_gap_competencies || []).slice(0, 8).map((c: any) => ({
      name: this.truncate(c.competency, 18),
      fullName: c.competency,
      gap: c.avg_gap,
      score: 100 - c.avg_gap,
      affected: c.employees_affected,
    }))
  );

  readonly gapBarData = computed(() => {
    const rows = this.barChartData();
    return {
      labels: rows.map((r: any) => r.name),
      datasets: [
        {
          label: this.i18n.t('skills_gap.overview.avg_gap'),
          data: rows.map((r: any) => r.gap),
          backgroundColor: rows.map((r: any) => this.getBarColor(r.gap)),
          borderRadius: 6,
          barThickness: 16,
        },
      ],
    };
  });

  readonly sevDonut = computed(() => {
    const sev = this.sev();
    const entries = [
      {
        name: this.i18n.t('skills_gap.severity.critical'),
        value: sev['critical'] || 0,
        fill: SEVERITY_COLORS['critical'],
      },
      {
        name: this.i18n.t('skills_gap.severity.medium'),
        value: sev['medium'] || 0,
        fill: SEVERITY_COLORS['medium'],
      },
      {
        name: this.i18n.t('skills_gap.severity.low'),
        value: sev['low'] || 0,
        fill: SEVERITY_COLORS['low'],
      },
      {
        name: this.i18n.t('skills_gap.severity.strength'),
        value: sev['strength'] || 0,
        fill: SEVERITY_COLORS['strength'],
      },
    ].filter((d) => d.value > 0);

    return {
      labels: entries.map((e) => e.name),
      datasets: [
        {
          data: entries.map((e) => e.value),
          backgroundColor: entries.map((e) => e.fill),
          borderColor: 'rgba(255,255,255,0.3)',
          borderWidth: 2,
        },
      ],
    };
  });

  private readonly deptCounts = computed(() => {
    const deptMap: Record<string, number> = {};
    (this.data()?.employees || []).forEach((e: any) => {
      const dept = e.department || 'N/A';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    return Object.entries(deptMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name: this.truncate(name, 14),
        value,
        fill: DEPT_COLORS[i % DEPT_COLORS.length],
      }));
  });

  readonly deptDonut = computed(() => {
    const rows = this.deptCounts();
    return {
      labels: rows.map((r) => r.name),
      datasets: [
        {
          data: rows.map((r) => r.value),
          backgroundColor: rows.map((r) => r.fill),
          borderColor: 'rgba(255,255,255,0.3)',
          borderWidth: 2,
        },
      ],
    };
  });

  readonly deptScoreBarData = computed(() => {
    const deptScoreMap: Record<string, { total: number; count: number }> = {};
    (this.data()?.employees || []).forEach((e: any) => {
      const dept = e.department || 'N/A';
      if (!deptScoreMap[dept]) deptScoreMap[dept] = { total: 0, count: 0 };
      deptScoreMap[dept].total += e.overall_score;
      deptScoreMap[dept].count += 1;
    });
    return Object.entries(deptScoreMap)
      .map(([dept, d]) => ({
        name: this.truncate(dept, 16),
        fullName: dept,
        score: Math.round(d.total / d.count),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  });

  readonly deptScoreData = computed(() => {
    const rows = this.deptScoreBarData();
    return {
      labels: rows.map((r) => r.name),
      datasets: [
        {
          label: this.i18n.t('skills_gap.overview.avg_score'),
          data: rows.map((r) => r.score),
          backgroundColor: rows.map((r) =>
            r.score >= 70 ? '#6366f1' : r.score >= 50 ? '#8b5cf6' : '#a78bfa'
          ),
          borderRadius: 6,
          barThickness: 18,
        },
      ],
    };
  });

  private formatMonth(m: string): string {
    try {
      const [y, mo] = m.split('-');
      const d = new Date(+y, +mo - 1);
      return d.toLocaleDateString(this.isRtl() ? 'ar-SA' : 'en-US', {
        month: 'short',
        year: '2-digit',
      });
    } catch {
      return m;
    }
  }

  readonly trendData = computed(() => {
    const trend = this.trend();
    return {
      labels: trend.map((t) => this.formatMonth(t.month)),
      datasets: [
        {
          label: this.i18n.t('skills_gap.overview.avg_score'),
          data: trend.map((t) => t.avg_score),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.2)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
        {
          label: this.i18n.t('skills_gap.overview.avg_gap'),
          data: trend.map((t) => t.avg_gap),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.2)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
      ],
    };
  });

  readonly donutOptions = {
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 8, font: { size: 10 }, padding: 8 },
      },
      tooltip: DARK_TOOLTIP,
    },
  };

  readonly horizontalBarOptions = {
    indexAxis: 'y' as const,
    scales: {
      x: {
        min: 0,
        max: 100,
        ticks: {
          color: '#94a3b8',
          font: { size: 9 },
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
    plugins: { legend: { display: false }, tooltip: DARK_TOOLTIP },
  };

  readonly trendOptions = {
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { size: 10, weight: 600 } },
        grid: { color: 'rgba(148,163,184,0.15)' },
        border: { display: false },
      },
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#94a3b8', font: { size: 10 } },
        grid: { color: 'rgba(148,163,184,0.15)' },
        border: { display: false },
      },
    },
    plugins: { legend: { display: false }, tooltip: DARK_TOOLTIP },
  };

  severityFor(gap: number): string {
    return gap >= 40 ? 'critical' : gap >= 20 ? 'medium' : 'low';
  }

  scoreClass(score: number): string {
    return (
      score >= 60
        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20'
        : score >= 40
        ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/20'
        : 'text-red-600 bg-red-50 dark:bg-red-950/20'
    );
  }
}
