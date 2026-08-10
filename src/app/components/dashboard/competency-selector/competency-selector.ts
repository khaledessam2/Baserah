import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@/services/i18n.service';
import { AnalysisService } from '@/services/analysis.service';
import { ButtonDirective } from '@/shared/directives/button.directive';
import {
  Dialog,
  DialogFooterDirective,
  DialogHeaderDirective,
  DialogTitleDirective,
} from '@/shared/components/dialog';
import { BadgeDirective, InputDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';
import { Slider } from '@/shared/components/slider/slider';
import { TABS_DIRECTIVES } from '@/shared/components/tabs';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

type CompetencyCategory = 'Core' | 'Behavioral' | 'Leadership' | 'Technical';

interface Competency {
  name: string;
  category: CompetencyCategory;
  priority: number;
  selected: boolean;
  skills: string[];
  kpis: string[];
  description: string;
  weight?: number;
}

interface CategoryTab {
  id: string;
  labelKey: string;
  fallback: string;
  icon: IconName;
  color: string;
  bg: string;
  activeBorder: string;
}

/** Port of `dashboard/CompetencySelector.tsx`. */
@Component({
  selector: 'app-competency-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    Dialog,
    DialogHeaderDirective,
    DialogTitleDirective,
    DialogFooterDirective,
    ButtonDirective,
    BadgeDirective,
    InputDirective,
    Icon,
    Slider,
    ...TABS_DIRECTIVES,
    TranslatePipe,
  ],
  templateUrl: './competency-selector.html',
})
export class CompetencySelector {
  readonly isOpen = input(false);
  readonly initialData = input.required<any>();
  readonly jobTitle = input.required<string>();
  readonly jobDescription = input.required<string>();
  readonly organizationName = input.required<string>();
  readonly userId = input.required<string>();

  readonly closed = output<void>();
  readonly confirmed = output<any>();

  private readonly i18n = inject(I18nService);
  private readonly analysisService = inject(AnalysisService);
  private readonly destroyRef = inject(DestroyRef);

  readonly parseFloat = parseFloat;
  readonly stars = [1, 2, 3, 4, 5];

  readonly competencies = signal<Competency[]>([]);
  readonly weights = signal<Record<string, number>>({});
  readonly activeTab = signal('Core');
  readonly isReweighting = signal(false);

  readonly categories: CategoryTab[] = [
    {
      id: 'Core',
      labelKey: 'competencies.core_title',
      fallback: 'Core',
      icon: 'Brain',
      color: 'text-primary',
      bg: 'bg-primary/10',
      activeBorder: 'border-primary',
    },
    {
      id: 'Behavioral',
      labelKey: 'competencies.behavioral_title',
      fallback: 'Behavioral',
      icon: 'Users',
      color: 'text-secondary',
      bg: 'bg-secondary/10',
      activeBorder: 'border-secondary',
    },
    {
      id: 'Leadership',
      labelKey: 'competencies.leadership_title',
      fallback: 'Leadership',
      icon: 'Crown',
      color: 'text-tertiary',
      bg: 'bg-tertiary/10',
      activeBorder: 'border-tertiary',
    },
    {
      id: 'Technical',
      labelKey: 'competencies.technical_title',
      fallback: 'Technical',
      icon: 'Settings2',
      color: 'text-fuchsia-500',
      bg: 'bg-fuchsia-500/10',
      activeBorder: 'border-fuchsia-500',
    },
    {
      id: 'Weights',
      labelKey: 'competencies.weights_title',
      fallback: 'Weights',
      icon: 'Scale',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      activeBorder: 'border-emerald-500',
    },
  ];

  /** The four competency tabs; 'Weights' renders its own panel. */
  readonly competencyCategories = this.categories.slice(0, 4);

  constructor() {
    effect(() => {
      const initialData = this.initialData();
      if (!initialData?.competencies) return;

      const all: Competency[] = [];
      const w: Record<string, number> = {};

      const mapComp = (list: any[] = [], category: CompetencyCategory) => {
        list.forEach((c) => {
          all.push({
            name: c.name,
            category,
            priority: c.priority || 3,
            selected: true,
            skills: c.skills || [],
            kpis: c.kpis || [],
            description: c.description || '',
            weight: c.weight || 0,
          });
          w[c.name] = c.weight || 0;
        });
      };

      mapComp(initialData.competencies.core, 'Core');
      mapComp(initialData.competencies.behavioral, 'Behavioral');
      mapComp(initialData.competencies.leadership, 'Leadership');
      mapComp(initialData.competencies.technical, 'Technical');

      this.competencies.set(all);
      this.weights.set(w);
    });

    // ✨ Auto-normalize weights when selection changes
    effect(() => {
      const selectedCount = this.competencies().filter((c) => c.selected).length;
      if (selectedCount === 0) return;

      // `normalizeWeights` both reads and writes `weights`, and it always
      // stores a fresh object — so a tracked read would make this effect
      // retrigger itself forever and lock the tab. `competencies` above is the
      // only intended dependency; React's dependency array made that explicit,
      // `untracked` is how it is spelled with signals.
      untracked(() => this.normalizeWeights());
    });
  }

  byCategory(category: string): Competency[] {
    return this.competencies().filter((c) => c.category === category);
  }

  readonly selectedCompetencies = computed(() =>
    this.competencies().filter((c) => c.selected)
  );

  weightOf(name: string): number {
    return this.weights()[name] || 0;
  }

  readonly currentTotal = computed(() =>
    this.selectedCompetencies().reduce(
      (sum, c) => sum + (this.weights()[c.name] || 0),
      0
    )
  );

  readonly isBalanced = computed(
    () => Math.abs(this.currentTotal() - 100) < 0.1
  );

  toggleSelection(name: string): void {
    this.competencies.update((prev) =>
      prev.map((c) => (c.name === name ? { ...c, selected: !c.selected } : c))
    );
  }

  updatePriority(name: string, priority: number): void {
    this.competencies.update((prev) =>
      prev.map((c) => (c.name === name ? { ...c, priority } : c))
    );
  }

  removeCompetency(name: string): void {
    this.competencies.update((prev) => prev.filter((c) => c.name !== name));
    this.weights.update((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  handleWeightChange(name: string, value: number): void {
    this.weights.update((prev) => ({ ...prev, [name]: value }));
  }

  normalizeWeights(): void {
    const selectedComps = this.competencies().filter((c) => c.selected);
    const weights = this.weights();
    const currentTotal = selectedComps.reduce(
      (sum, c) => sum + (weights[c.name] || 0),
      0
    );

    if (currentTotal === 0) {
      const equalWeight = 100 / selectedComps.length;
      const newWeights: Record<string, number> = {};
      selectedComps.forEach((c) => {
        newWeights[c.name] = equalWeight;
      });
      this.weights.set(newWeights);
      return;
    }

    const factor = 100 / currentTotal;
    const newWeights: Record<string, number> = {};
    selectedComps.forEach((c) => {
      newWeights[c.name] = (weights[c.name] || 0) * factor;
    });
    this.weights.set(newWeights);
  }

  handleAiReweight(): void {
    this.isReweighting.set(true);

    // Map current selected competencies to backend format
    const selectedComps = this.competencies()
      .filter((c) => c.selected)
      .map((c) => ({
        competency_name: c.name,
        competency_type:
          c.category === 'Core'
            ? 'core_competency'
            : c.category === 'Behavioral'
            ? 'general_behavioral_competency'
            : c.category === 'Leadership'
            ? 'leadership_behavioral_competency'
            : 'technical_competency',
      }));

    this.analysisService
      .reweightCompetencies({
        job_title: this.jobTitle(),
        job_description: { description: this.jobDescription() },
        user_id: this.userId(),
        organization_name: this.organizationName(),
        competencies: selectedComps,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.data.competencies) {
            const newWeights: Record<string, number> = {};
            response.data.competencies.forEach((c: any) => {
              newWeights[c.competency_name] = c.weight * 100;
            });
            this.weights.set(newWeights);
          }
          this.isReweighting.set(false);
        },
        error: (error) => {
          console.error('Reweighting failed:', error);
          alert(this.i18n.t('errors.generic_error'));
          this.isReweighting.set(false);
        },
      });
  }

  handleConfirm(): void {
    const selectedComps = this.competencies().filter((c) => c.selected);
    const weights = this.weights();
    const initialData = this.initialData();

    const byCategory = (category: CompetencyCategory) =>
      selectedComps
        .filter((c) => c.category === category)
        .map((c) => ({ ...c, weight: weights[c.name] || 0 }));

    this.confirmed.emit({
      ...initialData,
      competencies: {
        core: byCategory('Core'),
        behavioral: byCategory('Behavioral'),
        leadership: byCategory('Leadership'),
        technical: byCategory('Technical'),
      },
      raw_results: {
        ...initialData.raw_results,
        weighted_competencies: weights,
      },
    });
  }

  /** Border colour only — `border-transparent` is the inactive state. */
  tabTriggerClass(cat: CategoryTab): string {
    return cat.id === this.activeTab() ? cat.activeBorder : 'border-transparent';
  }

  competencyRowClass(comp: Competency): string {
    return comp.selected
      ? 'glass-card border-primary/20 bg-primary/5 shadow-primary/5'
      : 'bg-muted/40 border-border opacity-60';
  }

  starClass(star: number, priority: number): string {
    return star <= priority
      ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
      : 'text-border hover:text-amber-200';
  }

  readonly totalBoxClass = computed(() =>
    this.isBalanced()
      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
      : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
  );
}
