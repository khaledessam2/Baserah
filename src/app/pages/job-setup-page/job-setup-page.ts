import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  EMPTY,
  catchError,
  finalize,
  of,
  switchMap,
  tap,
  type Observable,
} from 'rxjs';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { TourService } from '@/services/tour.service';
import { AnalysisService } from '@/services/analysis.service';
import { getTourSteps } from '@/shared/config/tour-config';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { InputDirective, LabelDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `pages/JobSetupPage.tsx`. */
@Component({
  selector: 'app-job-setup-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonDirective,
    ...CARD_DIRECTIVES,
    InputDirective,
    LabelDirective,
    Icon,
    TranslatePipe,
  ],
  templateUrl: './job-setup-page.html',
})
export class JobSetupPage implements OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly tour = inject(TourService);
  private readonly analysisService = inject(AnalysisService);
  private readonly destroyRef = inject(DestroyRef);

  readonly levels = [1, 2, 3, 4, 5];

  readonly jobTitle = signal('');
  readonly jobDescription = signal('');
  readonly competencyMode = signal<'standard' | 'ai' | 'custom'>('ai');
  readonly level = signal(3);

  // Available job titles from backend
  readonly availableTitles = signal<string[]>([]);
  readonly titlesInfo = signal<Record<string, boolean>>({});
  readonly isLoading = signal(true);
  readonly showAllTitles = signal(false);

  // Track which title is generating JD
  readonly generatingFor = signal<string | null>(null);
  readonly isGenerating = signal(false);

  // Organization name
  readonly organizationName = signal('');

  private tourTimer?: ReturnType<typeof setTimeout>;

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  constructor() {
    effect(() => {
      this.auth.user();
      this.fetchTitles();
    });

    if (!this.tour.hasSeen('job-setup')) {
      this.tourTimer = setTimeout(() => {
        this.tour.startTour(getTourSteps(this.i18n)['job-setup'], 'job-setup');
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.tourTimer) clearTimeout(this.tourTimer);
  }

  private fetchTitles(): void {
    this.isLoading.set(true);

    const user = this.auth.user();
    // Get organization name from storage or user context
    const companyName =
      user?.organization_name ||
      localStorage.getItem('companyName') ||
      sessionStorage.getItem('companyName') ||
      '';
    this.organizationName.set(companyName);

    const applyManualDescription = () => {
      // Check for manual description from Intro page
      const manualDesc = localStorage.getItem('manualJobDescription');
      if (manualDesc && !this.jobDescription()) {
        this.jobDescription.set(manualDesc);
      }
    };

    // First check if we have manually generated titles from previous steps
    const savedTitles = localStorage.getItem('generatedTitles');
    if (savedTitles) {
      const parsed = JSON.parse(savedTitles) as string[];
      this.availableTitles.set(parsed.map((t) => t.trim()));
    }

    if (!companyName) {
      applyManualDescription();
      this.isLoading.set(false);
      return;
    }

    // Fetch from backend with organization filter
    const userId = user?.id || localStorage.getItem('userId');
    const titles$: Observable<unknown> = savedTitles
      ? of(null)
      : this.analysisService
          .getJobTitles(companyName, userId || undefined)
          .pipe(
            tap((titles) => {
              if (titles.length > 0) {
                this.availableTitles.set(titles.map((t) => t.trim()));
              }
            })
          );

    titles$
      .pipe(
        // Fetch JD presence info
        switchMap(() =>
          this.analysisService.getJobTitlesWithJD(companyName, user?.id)
        ),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (jdPresence) => {
          this.titlesInfo.set(jdPresence);
          applyManualDescription();
        },
        error: (error) => console.error('Error loading titles', error),
      });
  }

  readonly displayedTitles = computed(() =>
    this.showAllTitles()
      ? this.availableTitles()
      : this.availableTitles().slice(0, 6)
  );

  hasJd(title: string): boolean {
    return !!this.titlesInfo()[title.trim()];
  }

  handleSelectTitle(title: string): void {
    this.jobTitle.set(title);
    // Picking a title starts from a blank description. Titles without a stored
    // JD used to leave the previous selection's text sitting in the textarea,
    // which then got analysed — and saved — against the wrong job.
    this.jobDescription.set('');

    // If this title has an existing JD, fetch and populate it
    if (!this.hasJd(title) || !this.organizationName()) return;

    this.analysisService
      .getExistingJobDescription(
        this.organizationName(),
        title,
        this.auth.user()?.id
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          // A slow response for a title the user has already moved off must
          // not land on top of the current selection.
          if (this.jobTitle() !== title) return;
          if (response.success && response.data.job_description) {
            this.jobDescription.set(response.data.job_description);
          }
        },
        error: (error) =>
          console.error(
            'Failed to fetch existing description on select:',
            error
          ),
      });
  }

  onGenerateForTitle(event: Event, title: string): void {
    event.stopPropagation();
    this.handleGenerateJDForTitle(title);
  }

  handleGenerateJDForTitle(title: string): void {
    this.generatingFor.set(title);
    // In the future, generateJobDescription could also take organizationName/userId
    this.analysisService
      .generateJobDescription(title)
      .pipe(
        switchMap((description) => {
          this.jobTitle.set(title);
          this.jobDescription.set(description);

          // Save immediately after generation
          if (!this.organizationName() || !description) return EMPTY;
          return this.analysisService.saveJobDescription({
            organization_name: this.organizationName(),
            job_title: title,
            job_description: description,
            user_id: this.auth.user()?.id,
          });
        }),
        finalize(() => this.generatingFor.set(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        // Update titlesInfo to show checkmark
        next: () => this.titlesInfo.update((prev) => ({ ...prev, [title]: true })),
        error: (error) => {
          console.error('Failed to generate description', error);
          alert(
            this.i18n.t(
              'job_setup.errors.jd_gen_failed',
              'Failed to generate job description'
            )
          );
        },
      });
  }

  handleGenerateDescription(): void {
    const jobTitle = this.jobTitle();
    if (!jobTitle) {
      alert(
        this.i18n.t(
          'job_setup.errors.title_required',
          'Please enter a job title first'
        )
      );
      return;
    }

    this.isGenerating.set(true);
    this.analysisService
      .generateJobDescription(jobTitle)
      .pipe(
        switchMap((description) => {
          this.jobDescription.set(description);

          // Save to backend immediately after generation
          const organizationName =
            localStorage.getItem('companyName') ||
            sessionStorage.getItem('companyName');
          const userId = localStorage.getItem('userId');

          if (!organizationName || !description) return EMPTY;
          return this.analysisService.saveJobDescription({
            organization_name: organizationName,
            job_title: jobTitle,
            job_description: description,
            user_id: userId || undefined,
          });
        }),
        finalize(() => this.isGenerating.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        error: (error) =>
          console.error('Failed to generate or save description', error),
      });
  }

  handleAnalyze(): void {
    if (!this.jobTitle() || !this.jobDescription()) {
      alert(
        this.i18n.t(
          'job_setup.errors.input_required',
          'Please specify a job title and description.'
        )
      );
      return;
    }

    const proceed = () => {
      // Save parameters for the analysis dashboard
      const setupData = {
        title: this.jobTitle(),
        description: this.jobDescription(),
        competencyMode: this.competencyMode(),
        level: this.level(),
      };
      localStorage.setItem('currentAnalysisSetup', JSON.stringify(setupData));

      // Navigate to Dashboard
      this.router.navigate(['/app/dashboard']);
    };

    // Save to backend first
    const organizationName =
      localStorage.getItem('companyName') ||
      sessionStorage.getItem('companyName');
    const userId = localStorage.getItem('userId');

    if (!organizationName) {
      proceed();
      return;
    }

    this.analysisService
      .saveJobDescription({
        organization_name: organizationName,
        job_title: this.jobTitle(),
        job_description: this.jobDescription(),
        user_id: userId || undefined,
      })
      .pipe(
        // We still proceed even if saving fails, as it's in localStorage anyway
        catchError((error) => {
          console.error('Failed to save JD to backend:', error);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => proceed());
  }

  readonly rootClass = computed(() =>
    cn(
      'w-full px-6 py-8 md:px-8 lg:px-12 min-h-[calc(100vh-100px)]',
      this.isRtl() && 'rtl'
    )
  );

  readonly columnsClass = computed(() =>
    cn(
      'flex flex-col lg:flex-row gap-8 items-stretch',
      this.isRtl() && 'lg:flex-row-reverse'
    )
  );

  readonly panelHeaderClass = computed(() =>
    cn('pb-4 bg-primary/5', this.isRtl() ? 'text-right' : 'text-left')
  );

  readonly panelTitleClass = computed(() =>
    cn(
      'flex items-center gap-2 text-xl font-bold',
      this.isRtl() && 'flex-row-reverse'
    )
  );

  readonly configTitleClass = computed(() =>
    cn(
      'flex items-center gap-3 text-xl font-bold',
      this.isRtl() && 'flex-row-reverse'
    )
  );

  readonly configContentClass = computed(() =>
    cn('space-y-8 p-8', this.isRtl() ? 'text-right' : 'text-left')
  );

  readonly inlineRowClass = computed(() =>
    cn('flex items-center gap-1.5', this.isRtl() ? 'flex-row-reverse' : 'flex-row')
  );

  titleRowClass(title: string): string {
    return cn(
      'group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden',
      this.isRtl() ? 'flex-row-reverse' : 'flex-row',
      this.jobTitle() === title
        ? 'bg-primary/10 border-primary ring-1 ring-primary/20'
        : 'hover:bg-card border-border bg-muted/20'
    );
  }

  readonly titleLabelWrapClass = computed(() =>
    cn(
      'flex items-center gap-3 truncate flex-1',
      this.isRtl() ? 'flex-row-reverse' : 'flex-row'
    )
  );

  titleTextClass(title: string): string {
    return cn(
      'text-sm font-bold truncate transition-colors',
      this.jobTitle() === title ? 'text-primary' : 'text-foreground/80'
    );
  }

  readonly titleInputClass = computed(() =>
    cn(
      'h-12 bg-muted/20 border-border focus:ring-primary/20 transition-all rounded-xl text-lg font-medium',
      this.isRtl() ? 'pr-12' : 'pl-12'
    )
  );

  readonly searchIconClass = computed(() =>
    cn(
      'w-5 h-5 absolute top-3.5 text-muted-foreground transition-colors group-focus-within:text-primary',
      this.isRtl() ? 'right-4' : 'left-4'
    )
  );

  readonly jdHeaderClass = computed(() =>
    cn(
      'flex justify-between items-center',
      this.isRtl() ? 'flex-row-reverse' : 'flex-row'
    )
  );

  readonly levelRowClass = computed(() =>
    cn('flex items-center gap-3', this.isRtl() ? 'flex-row-reverse' : 'flex-row')
  );

  levelButtonClass(l: number): string {
    return cn(
      'w-11 h-11 rounded-xl flex items-center justify-center border-2 font-black transition-all text-lg',
      this.level() === l
        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-110'
        : 'bg-muted/20 text-muted-foreground border-border hover:border-primary/50'
    );
  }

  readonly modeRowClass = computed(() =>
    cn(
      'flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl border border-border shadow-inner',
      this.isRtl() ? 'flex-row-reverse' : 'flex-row'
    )
  );

  modeButtonClass(mode: 'ai' | 'standard'): string {
    return cn(
      'flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all',
      this.competencyMode() === mode
        ? 'bg-card shadow-md text-primary'
        : 'text-muted-foreground hover:bg-card/40'
    );
  }

  readonly analyzeRowClass = computed(() =>
    cn('flex items-center gap-3', this.isRtl() ? 'flex-row-reverse' : 'flex-row')
  );

  readonly playIconClass = computed(() =>
    cn(
      'w-6 h-6 fill-current transition-transform group-hover:scale-110',
      this.isRtl() && 'rotate-180'
    )
  );
}
