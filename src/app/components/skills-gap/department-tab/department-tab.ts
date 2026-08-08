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
import { cn } from '@/shared/utils/utils';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { ChartComponent } from '@/shared/components/chart/chart';
import { Icon } from '@/shared/components/icon/icon';
import { SELECT_DIRECTIVES } from '@/shared/components/select';
import { GapBadge } from '../gap-badge/gap-badge';
import { ScoreBar } from '../score-bar/score-bar';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

const DEPT_COLORS = [
  '#6366f1',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];

const DARK_TOOLTIP = {
  backgroundColor: 'rgba(15,23,42,0.95)',
  borderColor: 'rgba(255,255,255,0.1)',
  borderWidth: 1,
  cornerRadius: 12,
  padding: 10,
  titleColor: '#e2e8f0',
  bodyColor: '#e2e8f0',
};

/** Port of `skills-gap/DepartmentTab.tsx`. */
@Component({
  selector: 'app-skills-gap-department-tab',
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
  templateUrl: './department-tab.html',
})
export class SkillsGapDepartmentTab {
  readonly orgName = input<string | undefined>(undefined);

  private readonly i18n = inject(I18nService);
  private readonly skillsGapService = inject(SkillsGapService);

  readonly data = signal<any>(null);
  readonly loading = signal(true);
  readonly expanded = signal<string | null>(null);
  readonly selectedDept = signal('__all__');

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      this.orgName();
      this.load();
    });
  }

  private load(): void {
    this.loading.set(true);
    this.skillsGapService
      .getDepartmentGap(undefined, this.orgName())
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

  readonly departments = computed<any[]>(() => this.data()?.departments || []);

  readonly filteredDepts = computed(() =>
    this.selectedDept() === '__all__'
      ? this.departments()
      : this.departments().filter((d) => d.department === this.selectedDept())
  );

  readonly totalEmployees = computed(() =>
    this.departments().reduce((s: number, d: any) => s + d.employee_count, 0)
  );

  /** Backend already sorts departments by gap descending. */
  readonly worstDept = computed(() => this.departments()[0]);

  readonly bestDept = computed(
    () => [...this.departments()].sort((a, b) => a.avg_gap - b.avg_gap)[0]
  );

  toggleExpanded(department: string): void {
    this.expanded.update((prev) => (prev === department ? null : department));
  }

  private truncate(value: string, max: number): string {
    return value.length > max ? value.substring(0, max) + '…' : value;
  }

  private getBarColor(gap: number): string {
    if (gap >= 60) return '#ef4444';
    if (gap >= 40) return '#f97316';
    if (gap >= 20) return '#eab308';
    return '#22c55e';
  }

  readonly gapRankingData = computed(() => {
    const rows = [...this.filteredDepts()]
      .sort((a: any, b: any) => b.avg_gap - a.avg_gap)
      .map((d: any) => ({
        name: this.truncate(d.department, 16),
        gap: d.avg_gap,
      }));
    return {
      labels: rows.map((r) => r.name),
      datasets: [
        {
          label: this.i18n.t('skills_gap.department.gap_label'),
          data: rows.map((r) => r.gap),
          backgroundColor: rows.map((r) => this.getBarColor(r.gap)),
          borderRadius: 6,
          barThickness: 18,
        },
      ],
    };
  });

  readonly empCountData = computed(() => {
    const rows = this.departments().map((d: any, i: number) => ({
      name: this.truncate(d.department, 14),
      value: d.employee_count,
      fill: DEPT_COLORS[i % DEPT_COLORS.length],
    }));
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

  readonly scoreCompareData = computed(() => {
    const rows = [...this.departments()]
      .sort((a: any, b: any) => b.avg_score - a.avg_score)
      .map((d: any) => ({
        name: this.truncate(d.department, 14),
        score: d.avg_score,
        gap: d.avg_gap,
      }));
    return {
      labels: rows.map((r) => r.name),
      datasets: [
        {
          label: this.i18n.t('skills_gap.role.score_label'),
          data: rows.map((r) => r.score),
          backgroundColor: '#6366f1',
          borderRadius: 4,
          barThickness: 24,
        },
        {
          label: this.i18n.t('skills_gap.department.gap_label'),
          data: rows.map((r) => r.gap),
          backgroundColor: 'rgba(239,68,68,0.6)',
          borderRadius: 4,
          barThickness: 24,
        },
      ],
    };
  });

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

  readonly verticalBarOptions = {
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { size: 9 } },
        grid: { color: 'rgba(148,163,184,0.12)' },
        border: { display: false },
      },
      y: {
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
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { font: { size: 10 }, padding: 8 },
      },
      tooltip: DARK_TOOLTIP,
    },
  };

  readonly donutOptions = {
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 8, font: { size: 10 }, padding: 6 },
      },
      tooltip: DARK_TOOLTIP,
    },
  };

  severityFor(gap: number): string {
    return gap >= 40 ? 'critical' : gap >= 20 ? 'medium' : 'low';
  }

  deptCardClass(department: string): string {
    return cn(
      'glass-card border-none cursor-pointer transition-all duration-300 shadow-lg overflow-hidden',
      this.expanded() === department &&
        'ring-2 ring-indigo-500/20 shadow-xl shadow-indigo-500/5'
    );
  }

  deptScoreClass(score: number): string {
    return cn(
      'text-sm font-black shrink-0',
      score >= 60
        ? 'text-emerald-500'
        : score >= 40
        ? 'text-amber-500'
        : 'text-red-500'
    );
  }

  employeeScoreClass(score: number): string {
    return cn(
      'text-xs font-black px-2 py-0.5 rounded-lg',
      score >= 60
        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400'
        : 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400'
    );
  }
}
