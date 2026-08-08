import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, of, switchMap, type Observable } from 'rxjs';
import { ApiService } from '@/services/api.service';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { TourService } from '@/services/tour.service';
import { getTourSteps } from '@/shared/config/tour-config';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { InputDirective, LabelDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

type InputMethod = 'file' | 'url' | 'manual';

/** Port of `pages/IntroPage.tsx`. */
@Component({
  selector: 'app-intro-page',
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
  templateUrl: './intro-page.html',
})
export class IntroPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);
  private readonly tour = inject(TourService);

  readonly companyName = signal('');
  readonly urls = signal<string[]>(['']);
  readonly manualDescription = signal('');
  readonly file = signal<File | null>(null);
  readonly isDragOver = signal(false);
  readonly isSubmitting = signal(false);
  readonly inputMethod = signal<InputMethod>('file');

  readonly methods: {
    id: InputMethod;
    icon: IconName;
    labelKey: string;
    fallback: string;
  }[] = [
    {
      id: 'file',
      icon: 'Upload',
      labelKey: 'intro.methods.file',
      fallback: 'Upload File',
    },
    {
      id: 'url',
      icon: 'Globe',
      labelKey: 'intro.methods.url',
      fallback: 'Website URL',
    },
    {
      id: 'manual',
      icon: 'FileText',
      labelKey: 'intro.methods.manual',
      fallback: 'Manual Text',
    },
  ];

  private tourTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      if (this.auth.user()?.role === 'employee') {
        this.router.navigate(['/app/employee-dashboard']);
      }
    });

    // Priority: User profile > LocalStorage
    effect(() => {
      const orgName = this.auth.user()?.organization_name;
      if (orgName) {
        this.companyName.set(orgName);
      } else {
        const savedCompany = localStorage.getItem('companyName');
        if (savedCompany) this.companyName.set(savedCompany);
      }
    });
  }

  ngOnInit(): void {
    if (!this.tour.hasSeen('intro')) {
      this.tourTimer = setTimeout(() => {
        this.tour.startTour(getTourSteps(this.i18n)['intro'], 'intro');
      }, 1000);
    }

    const savedUrls = localStorage.getItem('jobDescriptionUrls');
    if (savedUrls) {
      try {
        this.urls.set(JSON.parse(savedUrls));
      } catch (e) {
        console.error('Failed to parse saved URLs', e);
      }
    }

    const savedDesc = localStorage.getItem('manualJobDescription');
    if (savedDesc) this.manualDescription.set(savedDesc);
  }

  ngOnDestroy(): void {
    if (this.tourTimer) clearTimeout(this.tourTimer);
  }

  private readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly contentClass = computed(() =>
    cn(
      'space-y-6 sm:space-y-8 px-4 sm:px-8',
      this.isRtl() ? 'text-right' : 'text-left'
    )
  );

  readonly fileSizeLabel = computed(() => {
    const f = this.file();
    return f ? `${(f.size / 1024 / 1024).toFixed(2)} MB` : '';
  });

  methodClass(id: InputMethod): string {
    return cn(
      'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300',
      this.inputMethod() === id
        ? 'bg-card text-primary shadow-md ring-1 ring-border'
        : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
    );
  }

  readonly dropZoneClass = computed(() =>
    cn(
      'border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group bg-muted/20',
      this.isDragOver()
        ? 'border-primary bg-primary/5 scale-[1.01]'
        : 'border-border hover:border-primary/50 hover:bg-muted/30'
    )
  );

  handleUrlChange(index: number, value: string): void {
    this.urls.update((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  addUrlField(): void {
    this.urls.update((prev) => [...prev, '']);
  }

  removeUrlField(index: number): void {
    this.urls.update((prev) => prev.filter((_, i) => i !== index));
  }

  handleDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver.set(true);
  }

  handleDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver.set(false);
    const droppedFile = e.dataTransfer?.files[0];
    if (droppedFile) this.file.set(droppedFile);
  }

  handleFileInput(e: Event): void {
    const selected = (e.target as HTMLInputElement).files?.[0];
    if (selected) this.file.set(selected);
  }

  clearFile(e: Event): void {
    e.stopPropagation();
    this.file.set(null);
  }

  handleSubmit(): void {
    const companyName = this.companyName();
    if (!companyName.trim()) {
      alert(this.i18n.t('intro.company_name_required', 'Please enter company name'));
      return;
    }

    this.isSubmitting.set(true);

    const user = this.auth.user();
    const filledUrls = this.urls().filter((u) => u.trim());

    // Update organization in backend if changed or new
    const updateOrg$: Observable<unknown> =
      user && user.organization_name !== companyName
        ? this.auth.updateOrganization(companyName)
        : of(null);

    // Process based on input method
    const processInput$: Observable<unknown> =
      this.inputMethod() === 'url' && filledUrls.length > 0
        ? this.api.post('/org/process-url', {
            organization_name: companyName,
            urls: filledUrls,
            user_id: user?.id,
          })
        : this.inputMethod() === 'manual' && this.manualDescription().trim()
        ? this.api.post('/org/manual-entry', {
            organization_name: companyName,
            content: this.manualDescription().trim(),
            user_id: user?.id,
          })
        : of(null);

    updateOrg$
      .pipe(
        switchMap(() => processInput$),
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          // Save to localStorage for UI state
          localStorage.setItem('companyName', companyName);
          localStorage.setItem(
            'jobDescriptionUrls',
            JSON.stringify(filledUrls)
          );
          if (this.manualDescription()) {
            localStorage.setItem(
              'manualJobDescription',
              this.manualDescription()
            );
          } else {
            localStorage.removeItem('manualJobDescription');
          }

          // Navigate to next step
          this.router.navigate(['/app/title-generation']);
        },
        error: (e) => {
          console.error('Failed to save organization', e);
          alert(this.i18n.t('intro.save_failed', 'Failed to save company data'));
        },
      });
  }
}
