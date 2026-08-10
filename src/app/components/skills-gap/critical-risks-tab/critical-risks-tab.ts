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
import { GapStatCard } from '../gap-stat-card/gap-stat-card';
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

/** Port of `skills-gap/CriticalRisksTab.tsx`. */
@Component({
  selector: 'app-skills-gap-critical-risks-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ...CARD_DIRECTIVES,
    ChartComponent,
    Icon,
    GapStatCard,
    TranslatePipe,
  ],
  templateUrl: './critical-risks-tab.html',
})
export class SkillsGapCriticalRisksTab {
  readonly orgName = input<string | undefined>(undefined);

  private readonly i18n = inject(I18nService);
  private readonly skillsGapService = inject(SkillsGapService);

  readonly data = signal<any>(null);
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
    this.skillsGapService
      .getCriticalRisks(this.orgName())
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

  gaugeDash(riskPercentage: number): string {
    return `${(riskPercentage / 100) * 264} 264`;
  }

  readonly riskSummaryText = computed(() =>
    this.i18n.t('skills_gap.risks.risk_summary_text', {
      at_risk: this.data()?.at_risk_count ?? 0,
      total: this.data()?.total_employees ?? 0,
    })
  );

  readonly criticalSkillsText = computed(() =>
    this.i18n.t('skills_gap.risks.critical_skills_text', {
      count: this.data()?.critical_skills?.length || 0,
    })
  );

  moreEmployeesText(count: number): string {
    return this.i18n.t('skills_gap.risks.more_employees', { count });
  }

  readonly criticalSkillsChart = computed(() => {
    const rows = (this.data()?.critical_skills || [])
      .slice(0, 8)
      .map((s: any) => ({
        name:
          s.competency.length > 16
            ? s.competency.substring(0, 16) + '…'
            : s.competency,
        actual: 100 - s.avg_gap,
        expected: 100,
      }));
    return {
      labels: rows.map((r: any) => r.name),
      datasets: [
        {
          label: this.i18n.t('skills_gap.role.required_level'),
          data: rows.map((r: any) => r.expected),
          backgroundColor: 'rgba(59,130,246,0.3)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 4,
          barThickness: 10,
        },
        {
          label: this.i18n.t('skills_gap.role.actual_level'),
          data: rows.map((r: any) => r.actual),
          backgroundColor: '#ef4444',
          borderRadius: 4,
          barThickness: 10,
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

  riskScoreClass(score: number): string {
    return score >= 40 ? 'text-amber-500' : 'text-red-500';
  }
}
