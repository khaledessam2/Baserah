import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap } from 'rxjs';
import { I18nService } from '@/services/i18n.service';
import { cn } from '@/shared/utils/utils';
import { afterPaint } from '@/shared/utils/after-paint';
import { exportAnalysisToPDF } from '@/shared/utils/pdf-export';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { ChartComponent } from '@/shared/components/chart/chart';
import { BadgeDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';
import { Progress } from '@/shared/components/progress/progress';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';
import type { AnalysisResult, AnalysisCompetency } from '@/models/analysis.model';

/**
 * Wrapped in hsl(). The React source used bare `var(--primary)`, but those
 * custom properties hold HSL *components* ("243 75% 59%"), so the pie slices
 * received an invalid colour and fell back to black.
 */
const COLORS: Record<string, string> = {
  Core: 'hsl(var(--primary))',
  Behavioral: 'hsl(var(--secondary))',
  Leadership: 'hsl(var(--tertiary))',
  Technical: '#f43f5e', // Rose-500
};

interface OverviewCard {
  titleKey: string;
  count: number;
  icon: IconName;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  id: 'core' | 'behavioral' | 'leadership' | 'technical';
}

/** Port of `dashboard/ResultsView.tsx`. */
@Component({
  selector: 'app-results-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonDirective,
    ...CARD_DIRECTIVES,
    BadgeDirective,
    Icon,
    Progress,
    ChartComponent,
    TranslatePipe,
  ],
  templateUrl: './results-view.html',
})
export class ResultsView implements OnDestroy {
  readonly result = input<AnalysisResult | null>(null);
  readonly isLoading = input(false);
  readonly progress = input(0);
  readonly isSaving = input(false);
  readonly save = output<void>();

  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly floor = Math.floor;
  readonly stars = [1, 2, 3, 4, 5];

  readonly expandedSections = signal<string[]>(['core']);
  readonly activeStage = signal(1);
  readonly displayProgress = signal(0);
  readonly secondsRemaining = signal(120);
  readonly isExporting = signal(false);

  readonly stages: { id: number; titleKey: string; descKey: string; icon: IconName }[] =
    [
      {
        id: 1,
        titleKey: 'results.stage_text',
        descKey: 'results.stage_text_desc',
        icon: 'FileText',
      },
      {
        id: 2,
        titleKey: 'results.stage_competencies',
        descKey: 'results.stage_competencies_desc',
        icon: 'Brain',
      },
      {
        id: 3,
        titleKey: 'results.stage_priority',
        descKey: 'results.stage_priority_desc',
        icon: 'Trophy',
      },
      {
        id: 4,
        titleKey: 'results.stage_skills',
        descKey: 'results.stage_skills_desc',
        icon: 'Target',
      },
      {
        id: 5,
        titleKey: 'results.stage_finalize',
        descKey: 'results.stage_finalize_desc',
        icon: 'CheckCircle2',
      },
    ];

  private timers: ReturnType<typeof setInterval>[] = [];

  constructor() {
    effect(() => {
      const isLoading = this.isLoading();
      const progress = this.progress();

      this.clearTimers();

      if (!isLoading) {
        this.activeStage.set(1);
        this.displayProgress.set(0);
        this.secondsRemaining.set(120);
        return;
      }

      this.secondsRemaining.set(120);

      // Countdown timer for smoother time update
      this.timers.push(
        setInterval(() => {
          this.secondsRemaining.update((prev) =>
            prev <= 10 ? prev : prev - 1
          ); // Don't go below 10s until done
        }, 1000)
      );

      // Sync displayProgress with actual progress but more smoothly
      this.timers.push(
        setInterval(() => {
          this.displayProgress.update((prev) => {
            // If we're at a plateau (like 30% where graph runs), creep slowly
            const slowStep = 0.05;
            const fastStep = 0.5;

            if (prev < progress) return prev + fastStep;
            if (prev < 99) return prev + slowStep;
            return prev;
          });
        }, 100)
      );

      // Logic for syncing stage with progress prop
      const getStageFromProgress = (p: number) => {
        if (p < 20) return 1;
        if (p < 40) return 2;
        if (p < 60) return 3;
        if (p < 80) return 4;
        return 5;
      };

      const targetStage = getStageFromProgress(progress);
      this.activeStage.update((prev) => Math.max(prev, targetStage));

      // Automatic progression timer for better UX
      this.timers.push(
        setInterval(() => {
          this.activeStage.update((prev) => (prev < 5 ? prev + 1 : prev));
        }, 8000) // Progress stage every 8 seconds if still loading
      );
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  readonly timeRemainingLabel = computed(() =>
    this.i18n.t('results.time_remaining_dynamic', {
      minutes: Math.floor(this.secondsRemaining() / 60),
      seconds: (this.secondsRemaining() % 60).toString().padStart(2, '0'),
    })
  );

  toggleSection(section: string): void {
    this.expandedSections.update((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  }

  isExpanded(section: string): boolean {
    return this.expandedSections().includes(section);
  }

  readonly overviewCards = computed<OverviewCard[]>(() => {
    const res = this.result();
    if (!res) return [];
    return [
      {
        titleKey: 'competencies.core_title',
        count: res.competencies.core.length,
        icon: 'Brain',
        colorClass: 'text-primary',
        bgClass: 'bg-primary/10',
        borderClass: 'border-primary/20',
        id: 'core',
      },
      {
        titleKey: 'competencies.behavioral_title',
        count: res.competencies.behavioral.length,
        icon: 'Users',
        colorClass: 'text-secondary',
        bgClass: 'bg-secondary/10',
        borderClass: 'border-secondary/20',
        id: 'behavioral',
      },
      {
        titleKey: 'competencies.leadership_title',
        count: res.competencies.leadership.length,
        icon: 'Crown',
        colorClass: 'text-tertiary',
        bgClass: 'bg-tertiary/10',
        borderClass: 'border-tertiary/20',
        id: 'leadership',
      },
      {
        titleKey: 'competencies.technical_title',
        count: res.competencies.technical.length,
        icon: 'Settings2',
        colorClass: 'text-fuchsia-500',
        bgClass: 'bg-fuchsia-500/10',
        borderClass: 'border-fuchsia-100/20',
        id: 'technical',
      },
    ];
  });

  itemsFor(id: OverviewCard['id']): AnalysisCompetency[] {
    return this.result()?.competencies[id] ?? [];
  }

  readonly categoryCounts = computed(() => {
    const res = this.result();
    if (!res) return [];
    return [
      {
        name: this.i18n.t('competencies.core_title'),
        count: res.competencies.core.length,
        type: 'Core',
        color: COLORS['Core'],
      },
      {
        name: this.i18n.t('competencies.behavioral_title'),
        count: res.competencies.behavioral.length,
        type: 'Behavioral',
        color: COLORS['Behavioral'],
      },
      {
        name: this.i18n.t('competencies.leadership_title'),
        count: res.competencies.leadership.length,
        type: 'Leadership',
        color: COLORS['Leadership'],
      },
      {
        name: this.i18n.t('competencies.technical_title'),
        count: res.competencies.technical.length,
        type: 'Technical',
        color: COLORS['Technical'],
      },
    ].filter((c) => c.count > 0);
  });

  readonly totalCompetencies = computed(() =>
    this.categoryCounts().reduce((acc, c) => acc + c.count, 0)
  );

  readonly priorityData = computed(() => {
    const res = this.result();
    if (!res) return [];
    return [
      ...res.competencies.core,
      ...res.competencies.behavioral,
      ...res.competencies.leadership,
      ...res.competencies.technical,
    ]
      .map((c) => ({ name: c.name, priority: c.priority, category: c.category }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);
  });

  readonly distributionData = computed(() => ({
    labels: this.categoryCounts().map((c) => c.name),
    datasets: [
      {
        data: this.categoryCounts().map((c) => c.count),
        backgroundColor: this.categoryCounts().map((c) => c.color),
        borderWidth: 0,
      },
    ],
  }));

  /** Donut geometry matching the recharts inner/outer radius and gap. */
  readonly distributionOptions = {
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1e293b',
        bodyColor: '#1e293b',
        borderWidth: 0,
        cornerRadius: 16,
        displayColors: true,
      },
    },
    animation: { duration: 1500 },
  };

  handleExportPDF(): void {
    const result = this.result();
    if (!result) return;

    this.isExporting.set(true);
    const t = (key: string, fallback: string) => this.i18n.t(key, fallback);

    // jsPDF blocks the main thread, so wait for the spinner to reach the screen
    // before starting — otherwise the flag flips on and off within one frame
    // and the user just sees the tab freeze.
    const export$ = exportAnalysisToPDF(result as any, {
      language: this.i18n.language(),
      translations: {
        title: t('pdf.title', 'Competency Analysis Report'),
        jobTitle: t('pdf.job_title', 'Job Title'),
        generatedAt: t('pdf.generated_at', 'Generated'),
        competencies: t('competencies.title', 'Competencies'),
        coreTitle: t('competencies.core_title', 'Core Competencies'),
        behavioralTitle: t(
          'competencies.behavioral_title',
          'Behavioral Competencies'
        ),
        leadershipTitle: t(
          'competencies.leadership_title',
          'Leadership Competencies'
        ),
        technicalTitle: t(
          'competencies.technical_title',
          'Technical Competencies'
        ),
        priority: t('results.priority', 'Priority'),
        skills: t('results.skills', 'Skills'),
        kpis: t('kpis.title', 'KPIs'),
        weight: t('competencies.weight', 'Weight'),
        summary: t('results.summary', 'Summary'),
        stats: t('results.stats', 'Statistics'),
        wordsAnalyzed: t('results.stats_words', 'Words'),
        skillsIdentified: t('results.stats_skills', 'Skills'),
        sectionsAnalyzed: t('results.stats_sections', 'Sections'),
        confidenceScore: t('results.confidence', 'Confidence'),
        total: t('results.total', 'Total'),
        poweredBy: t('pdf.powered_by', 'Powered by Baserah AI'),
      },
    });

    afterPaint()
      .pipe(
        switchMap(() => export$),
        finalize(() => this.isExporting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        error: (error) => {
          console.error('PDF export failed:', error);
          alert(this.i18n.t('errors.export_failed', 'Failed to export PDF'));
        },
      });
  }

  stageRowClass(id: number): string {
    const isActive = this.activeStage() === id;
    return cn(
      'flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500',
      isActive
        ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10 -translate-y-1'
        : 'bg-muted/30 border-transparent opacity-60'
    );
  }

  stageBadgeClass(id: number): string {
    const isCompleted = this.activeStage() > id;
    const isActive = this.activeStage() === id;
    return cn(
      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-500',
      isCompleted
        ? 'bg-emerald-500 text-white'
        : isActive
        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 transform'
        : 'bg-muted text-muted-foreground'
    );
  }

  sectionHeaderClass(id: string): string {
    return cn(
      'w-full p-6 flex items-center justify-between transition-all duration-300 hover:bg-muted/30 focus:outline-hidden',
      this.isExpanded(id) && 'bg-muted/20 border-b border-border/50'
    );
  }

  chevronClass(id: string): string {
    return cn(
      'p-2 bg-muted/50 rounded-lg transition-transform duration-300',
      this.isExpanded(id) ? 'rotate-180 text-primary' : 'text-muted-foreground'
    );
  }

  priorityDotClass(s: number, priority: number): string {
    return cn(
      'w-2 h-2 rounded-full transition-all duration-300',
      s <= priority
        ? 'bg-amber-400 scale-110 shadow-xs shadow-amber-400/50'
        : 'bg-border'
    );
  }
}
