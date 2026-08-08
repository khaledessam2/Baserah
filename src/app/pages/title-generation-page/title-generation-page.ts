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
  concatMap,
  finalize,
  from,
  last,
  map,
  switchMap,
  tap,
  throwError,
  timer,
} from 'rxjs';
import { ApiService } from '@/services/api.service';
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

// Loading step type
interface LoadingStep {
  id: string;
  labelKey: string;
  fallback: string;
  status: 'pending' | 'active' | 'completed';
}

/** Port of `pages/TitleGenerationPage.tsx`. */
@Component({
  selector: 'app-title-generation-page',
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
  templateUrl: './title-generation-page.html',
})
export class TitleGenerationPage implements OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly analysisService = inject(AnalysisService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);
  private readonly tour = inject(TourService);

  readonly Number = Number;

  readonly step = signal(1);
  readonly organization = signal('');
  readonly generationMethod = signal<'ai' | 'manual' | null>(null);
  readonly file = signal<File | null>(null);
  readonly isUploading = signal(false);
  readonly manualTitles = signal('');
  readonly maxStep = signal(1);

  // Additional fields from original
  readonly sheetName = signal('');
  readonly batchSize = signal(10);

  // Loading overlay state
  readonly showLoadingOverlay = signal(false);
  readonly loadingSteps = signal<LoadingStep[]>([
    {
      id: 'upload',
      labelKey: 'title_gen.loading.upload',
      fallback: 'Uploading file',
      status: 'pending',
    },
    {
      id: 'extract',
      labelKey: 'title_gen.loading.extract',
      fallback: 'Extracting employee data',
      status: 'pending',
    },
    {
      id: 'accounts',
      labelKey: 'title_gen.loading.accounts',
      fallback: 'Creating user accounts',
      status: 'pending',
    },
    {
      id: 'jobs',
      labelKey: 'title_gen.loading.jobs',
      fallback: 'Processing job data',
      status: 'pending',
    },
    {
      id: 'save',
      labelKey: 'title_gen.loading.save',
      fallback: 'Saving to database',
      status: 'pending',
    },
  ]);
  readonly uploadResult = signal<{ success: boolean; message: string } | null>(
    null
  );

  private tourTimer?: ReturnType<typeof setTimeout>;

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly steps = computed(() => [
    { number: 1, title: this.i18n.t('common.organization', 'Organization') },
    { number: 2, title: this.i18n.t('title_gen.steps.method', 'Method') },
    { number: 3, title: this.i18n.t('title_gen.steps.data', 'Data') },
  ]);

  constructor() {
    // Load company name from previous step or user context
    effect(() => {
      const orgName = this.auth.user()?.organization_name;
      if (orgName) {
        this.organization.set(orgName);
      } else {
        const savedCompany =
          localStorage.getItem('companyName') ||
          sessionStorage.getItem('companyName');
        if (savedCompany) this.organization.set(savedCompany);
      }
    });

    effect(() => {
      const step = this.step();
      if (step > this.maxStep()) this.maxStep.set(step);

      // Auto-start tour on Step 3 for the relevant data parts
      if (step === 3 && !this.tour.hasSeen('title-generation')) {
        this.tourTimer = setTimeout(() => {
          this.tour.startTour(
            getTourSteps(this.i18n)['title-generation'],
            'title-generation'
          );
        }, 1000);
      }
    });

    // Check for existing titles if organization is set
    effect(() => {
      const organization = this.organization();
      if (!organization) return;
      this.checkExistingTitles(organization);
    });
  }

  ngOnDestroy(): void {
    if (this.tourTimer) clearTimeout(this.tourTimer);
  }

  private checkExistingTitles(organization: string): void {
    const userId = this.auth.user()?.id || localStorage.getItem('userId');
    this.analysisService
      .getJobTitles(organization, userId || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // If we have titles, we could potentially prepopulate manualTitles or
        // skip to the next step.
        error: (err) => console.error('Failed to check existing titles', err),
      });
  }

  private activateStep(stepId: string): void {
    this.loadingSteps.update((prev) => {
      const stepIndex = prev.findIndex((s) => s.id === stepId);
      return prev.map((s, idx) => {
        if (idx < stepIndex) return { ...s, status: 'completed' as const };
        if (idx === stepIndex) return { ...s, status: 'active' as const };
        return { ...s, status: 'pending' as const };
      });
    });
  }

  private resetLoadingSteps(): void {
    this.loadingSteps.update((prev) =>
      prev.map((s) => ({ ...s, status: 'pending' as const }))
    );
  }

  handleUploadUnifiedFile(): void {
    const file = this.file();
    const organization = this.organization();

    if (!file || !organization) {
      alert(
        this.i18n.t(
          'title_gen.errors.file_required',
          'Please select a file and enter organization name'
        )
      );
      return;
    }

    this.isUploading.set(true);
    this.showLoadingOverlay.set(true);
    this.resetLoadingSteps();

    // Start automatic progression for better UX
    const progressionTimer = setInterval(() => {
      this.loadingSteps.update((prev) => {
        const activeIdx = prev.findIndex((s) => s.status === 'active');
        const nextIdx = activeIdx + 1;

        // Don't auto-complete the last step (saving) until we actually finish
        if (nextIdx < prev.length - 1) {
          return prev.map((s, idx) => {
            if (idx === activeIdx) return { ...s, status: 'completed' as const };
            if (idx === nextIdx) return { ...s, status: 'active' as const };
            return s;
          });
        }
        return prev;
      });
    }, 5000); // Progress every 5 seconds if still loading

    // Initialize first step
    this.activateStep('upload');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('organization_name', organization);
    formData.append(
      'user_id',
      this.auth.user()?.id || localStorage.getItem('userId') || 'unknown'
    );
    formData.append('provider', 'openai');
    formData.append('model_name', 'gpt-4o-mini');
    formData.append('save_to_db', 'true');
    if (this.sheetName()) formData.append('sheet_name', this.sheetName());
    formData.append('encoding', 'utf-8');
    if (this.batchSize()) {
      formData.append('batch_size', String(this.batchSize()));
    }

    this.api
      .post<any>('/file/extract-employee-data', formData)
      .pipe(
        // Stop automatic progression
        tap(() => clearInterval(progressionTimer)),
        switchMap((result) => {
          // A non-2xx status would have thrown, so only `success` is left to
          // check.
          if (!result.success) {
            return throwError(
              () =>
                new Error(
                  result.detail ||
                    result.message ||
                    this.i18n.t('errors.generic_error')
                )
            );
          }

          // Complete remaining steps quickly
          return from(['extract', 'accounts', 'jobs', 'save']).pipe(
            concatMap((stepId) => {
              this.activateStep(stepId);
              return timer(600);
            }),
            last(),
            map(() => result)
          );
        }),
        finalize(() => {
          // Covers the error path, where the timer is still running.
          clearInterval(progressionTimer);
          this.isUploading.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          // Complete all steps
          this.loadingSteps.update((prev) =>
            prev.map((s) => ({ ...s, status: 'completed' as const }))
          );

          const employeesCreated = result.data?.user_accounts_created || 0;
          const totalEmployees = result.data?.total_employees_extracted || 0;
          const skippedDuplicates =
            result.data?.mongodb_result?.skipped_duplicates || 0;
          const savedCount = result.data?.mongodb_result?.saved_count || 0;

          const t = (key: string, fallback?: string) =>
            this.i18n.t(key, fallback);

          let successMessage = `✅ ${t(
            'title_gen.success_prefix',
            'File processed successfully!'
          )}\n👥 ${totalEmployees} ${t('common.employees')} ${t(
            'title_gen.in_file',
            'in file'
          )}\n`;
          if (skippedDuplicates > 0) {
            successMessage += `💾 ${savedCount} ${t(
              'title_gen.new_employees',
              'new employees saved'
            )}\n⏭️ ${skippedDuplicates} ${t(
              'title_gen.duplicates_skipped',
              'duplicates skipped'
            )}\n`;
          } else {
            successMessage += `💾 ${savedCount} ${t('common.employees')} ${t(
              'common.saved',
              'saved'
            )}\n`;
          }
          successMessage += `🔑 ${employeesCreated} ${t(
            'title_gen.accounts_created',
            'accounts created'
          )}`;

          this.uploadResult.set({ success: true, message: successMessage });

          // Save organization info for next page
          sessionStorage.setItem('companyName', organization);
          localStorage.setItem('companyName', organization);

          // Navigate after delay
          setTimeout(() => {
            this.showLoadingOverlay.set(false);
            this.router.navigate(['/app/job-setup']);
          }, 2000);
        },
        error: (error: any) => {
          console.error('Upload error:', error);
          this.uploadResult.set({
            success: false,
            message: error.message || this.i18n.t('errors.generic_error'),
          });
          this.showLoadingOverlay.set(false);
        },
      });
  }

  handleNext(): void {
    if (this.step() < 3) {
      this.step.update((s) => s + 1);
      return;
    }

    if (this.generationMethod() === 'ai') {
      this.handleUploadUnifiedFile();
    } else if (
      this.generationMethod() === 'manual' &&
      this.manualTitles() &&
      this.organization()
    ) {
      const titlesList = this.manualTitles()
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const parts = line.split('->');
          return parts[parts.length - 1].trim();
        });

      const goToJobSetup = () => {
        localStorage.setItem('companyName', this.organization());
        this.router.navigate(['/app/job-setup']);
      };

      if (titlesList.length === 0) {
        goToJobSetup();
        return;
      }

      this.isUploading.set(true);
      const userId = this.auth.user()?.id || localStorage.getItem('userId');
      this.analysisService
        .saveJobTitles(titlesList, this.organization(), userId || undefined)
        .pipe(
          finalize(() => this.isUploading.set(false)),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: () => goToJobSetup(),
          error: (error) => console.error('Save titles failed', error),
        });
    } else {
      this.router.navigate(['/app/job-setup']);
    }
  }

  handleBack(): void {
    if (this.step() > 1) this.step.update((s) => s - 1);
  }

  goToStep(number: number): void {
    if (number <= this.maxStep()) this.step.set(number);
  }

  openFilePicker(): void {
    document.getElementById('file-input')?.click();
  }

  handleFileSelect(selectedFile: File): void {
    const validExtensions = ['csv', 'xlsx', 'xls'];
    const fileExtension =
      selectedFile.name.split('.').pop()?.toLowerCase() || '';

    if (!validExtensions.includes(fileExtension)) {
      alert(
        this.i18n.t(
          'title_gen.errors.unsupported_file',
          'File type not supported. Please upload CSV or Excel'
        )
      );
      return;
    }

    this.file.set(selectedFile);
  }

  handleFileInput(e: Event): void {
    const selected = (e.target as HTMLInputElement).files?.[0];
    if (selected) this.handleFileSelect(selected);
  }

  handleDrop(e: DragEvent): void {
    e.preventDefault();
    const droppedFile = e.dataTransfer?.files[0];
    if (droppedFile) this.handleFileSelect(droppedFile);
  }

  readonly nextDisabled = computed(
    () =>
      (this.step() === 2 && !this.generationMethod()) ||
      (this.step() === 3 && this.generationMethod() === 'ai' && !this.file()) ||
      this.isUploading()
  );

  loadingRowClass(s: LoadingStep): string {
    return cn(
      'flex items-center gap-3 p-3 rounded-xl transition-all',
      this.isRtl() ? 'flex-row-reverse' : 'flex-row',
      s.status === 'active' &&
        'bg-primary/10 text-primary font-semibold ring-1 ring-primary/20',
      s.status === 'completed' && 'text-emerald-500 bg-emerald-500/5',
      s.status === 'pending' && 'text-muted-foreground'
    );
  }

  loadingBadgeClass(s: LoadingStep): string {
    return cn(
      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
      s.status === 'active' && 'bg-primary text-primary-foreground animate-pulse',
      s.status === 'completed' && 'bg-emerald-500 text-white',
      s.status === 'pending' && 'bg-muted text-muted-foreground'
    );
  }

  uploadResultClass(success: boolean): string {
    return cn(
      'mt-6 p-4 rounded-xl text-sm whitespace-pre-wrap ring-1',
      this.isRtl() ? 'text-right' : 'text-left',
      success
        ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20'
        : 'bg-destructive/10 text-destructive ring-destructive/20'
    );
  }

  readonly wizardRowClass = computed(() =>
    cn('flex items-center gap-4', this.isRtl() ? 'flex-row-reverse' : 'flex-row')
  );

  stepWrapperClass(number: number): string {
    return cn(
      'flex items-center',
      this.isRtl() ? 'flex-row-reverse' : 'flex-row',
      number <= this.maxStep() ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
    );
  }

  stepCircleClass(number: number): string {
    return cn(
      'flex items-center justify-center w-10 h-10 rounded-full font-bold border-2 transition-all duration-300',
      this.step() >= number
        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-110'
        : 'bg-background text-muted-foreground border-border',
      number <= this.maxStep() && 'hover:border-primary/50'
    );
  }

  stepLabelClass(number: number): string {
    return cn(
      'text-sm font-semibold hidden sm:block',
      this.isRtl() ? 'mr-3' : 'ml-3',
      this.step() >= number ? 'text-foreground' : 'text-muted-foreground'
    );
  }

  stepConnectorClass(number: number): string {
    return cn(
      'w-12 h-0.5 rounded-full',
      this.isRtl() ? 'mr-4' : 'ml-4',
      this.step() > number ? 'bg-primary' : 'bg-border'
    );
  }

  methodCardClass(method: 'ai' | 'manual'): string {
    const selected = this.generationMethod() === method;
    return cn(
      'cursor-pointer rounded-4xl border-2 p-8 transition-all duration-300 flex flex-col items-center text-center gap-4 hover:-translate-y-1',
      method === 'ai'
        ? selected
          ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10'
          : 'border-border bg-card/50 hover:border-primary/30'
        : selected
        ? 'border-secondary bg-secondary/5 shadow-xl shadow-secondary/10'
        : 'border-border bg-card/50 hover:border-secondary/30'
    );
  }

  readonly fileRowClass = computed(() =>
    cn('flex items-center gap-3', this.isRtl() ? 'flex-row-reverse' : 'flex-row')
  );

  readonly manualHintClass = computed(() =>
    cn(
      'flex items-center gap-3 p-4 bg-primary/5 text-primary rounded-2xl text-xs ring-1 ring-primary/10',
      this.isRtl() ? 'flex-row-reverse' : 'flex-row'
    )
  );

  readonly manualHintTextClass = computed(() =>
    cn('leading-relaxed', this.isRtl() ? 'text-right' : 'text-left')
  );

  readonly footerClass = computed(() =>
    cn(
      'p-8 border-t border-border bg-muted/20 flex justify-between rounded-b-4xl',
      this.isRtl() ? 'flex-row-reverse' : 'flex-row'
    )
  );

  readonly backArrowClass = computed(() =>
    cn('w-4 h-4', this.isRtl() && 'rotate-180')
  );

  readonly nextArrowClass = computed(() =>
    cn('w-4 h-4', this.isRtl() && 'rotate-180')
  );
}
