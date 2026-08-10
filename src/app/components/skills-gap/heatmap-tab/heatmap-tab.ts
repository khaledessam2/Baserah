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
import { Icon } from '@/shared/components/icon/icon';
import { SELECT_DIRECTIVES } from '@/shared/components/select';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/* ── Vibrant color scale matching Skills Matrix reference ── */
const LEVEL_COLORS = [
  { min: 0, max: 20, bg: '#ef4444', text: '#fff', label: 'Training Required' },
  { min: 20, max: 40, bg: '#f97316', text: '#fff', label: 'Currently Training' },
  { min: 40, max: 60, bg: '#eab308', text: '#1e293b', label: 'Basic Complete' },
  { min: 60, max: 80, bg: '#22c55e', text: '#fff', label: 'Skilled Enough' },
  { min: 80, max: 101, bg: '#6366f1', text: '#fff', label: 'Can Coach' },
];

function getHeatColor(score: number | null): { bg: string; text: string } {
  if (score === null) return { bg: 'transparent', text: '' };
  const s = Math.max(0, Math.min(100, score));
  for (const level of LEVEL_COLORS) {
    if (s >= level.min && s < level.max) {
      return { bg: level.bg, text: level.text };
    }
  }
  return { bg: '#6366f1', text: '#fff' };
}

/** Port of `skills-gap/HeatmapTab.tsx`. */
@Component({
  selector: 'app-skills-gap-heatmap-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...CARD_DIRECTIVES, Icon, ...SELECT_DIRECTIVES, TranslatePipe],
  templateUrl: './heatmap-tab.html',
})
export class SkillsGapHeatmapTab {
  readonly orgName = input<string | undefined>(undefined);

  private readonly i18n = inject(I18nService);
  private readonly skillsGapService = inject(SkillsGapService);

  readonly levels = LEVEL_COLORS;
  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly data = signal<any>(null);
  readonly loading = signal(true);
  readonly filterDept = signal('__all__');
  readonly filterRole = signal('__all__');

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
      .getHeatmap(this.orgName())
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

  // Extract unique departments and roles for filters
  readonly allEmployees = computed<any[]>(() => this.data()?.employees || []);

  readonly departments = computed(() => {
    const set = new Set<string>();
    this.allEmployees().forEach((e) => {
      if (e.department && e.department !== 'N/A') set.add(e.department);
    });
    return Array.from(set).sort();
  });

  readonly roles = computed(() => {
    const set = new Set<string>();
    this.allEmployees().forEach((e) => {
      if (e.job_title && e.job_title !== 'N/A') set.add(e.job_title);
    });
    return Array.from(set).sort();
  });

  // Apply filters
  readonly filteredEmployees = computed(() => {
    let result = this.allEmployees();
    if (this.filterDept() !== '__all__') {
      result = result.filter((e) => e.department === this.filterDept());
    }
    if (this.filterRole() !== '__all__') {
      result = result.filter((e) => e.job_title === this.filterRole());
    }
    return result;
  });

  readonly comps = computed<string[]>(() => this.data()?.competencies || []);

  // Compute summary rows (Average per competency)
  readonly summaryAverages = computed<(number | null)[]>(() => {
    const employees = this.filteredEmployees();
    const comps = this.comps();
    if (employees.length === 0 || comps.length === 0) return [];

    const averages: (number | null)[] = [];
    for (let ci = 0; ci < comps.length; ci++) {
      let sum = 0;
      let count = 0;
      for (const emp of employees) {
        const cell = (emp.cells || [])[ci];
        if (cell && cell.score !== null) {
          sum += cell.score;
          count++;
        }
      }
      averages.push(count > 0 ? Math.round(sum / count) : null);
    }
    return averages;
  });

  readonly overallAverage = computed(() => {
    const employees = this.filteredEmployees();
    return employees.length > 0
      ? Math.round(
          employees.reduce((s, e) => s + e.overall_score, 0) / employees.length
        )
      : 0;
  });

  truncate(value: string, max: number): string {
    return value.length > max ? value.slice(0, max) + '…' : value;
  }

  heatBg(score: number | null): string {
    return getHeatColor(score).bg;
  }

  heatText(score: number | null): string {
    return getHeatColor(score).text;
  }

  overallScoreClass(score: number): string {
    return (
      score >= 70
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : score >= 50
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    );
  }

}
