import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { ThemeService } from '@/services/theme.service';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { Icon } from '@/shared/components/icon/icon';
import { RevealDirective } from '@/shared/directives/reveal.directive';
import { LanguageSelector } from '@/components/layout/language-selector/language-selector';
import { ThemeToggle } from '@/components/layout/theme-toggle/theme-toggle';
import { LandingFAQ } from '@/components/landing/landing-faq/landing-faq';
import { LandingFeatures } from '@/components/landing/landing-features/landing-features';
import { LandingFooter } from '@/components/landing/landing-footer/landing-footer';
import { LandingGuidedTourSection } from '@/components/landing/landing-guided-tour-section/landing-guided-tour-section';
import { LandingHero } from '@/components/landing/landing-hero/landing-hero';
import { LandingHowItWorks } from '@/components/landing/landing-how-it-works/landing-how-it-works';
import { LandingProblemSolution } from '@/components/landing/landing-problem-solution/landing-problem-solution';
import { LandingTestimonials } from '@/components/landing/landing-testimonials/landing-testimonials';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `pages/LandingPage.tsx`. */
@Component({
  selector: 'app-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ButtonDirective,
    Icon,
    RevealDirective,
    ThemeToggle,
    LanguageSelector,
    LandingHero,
    LandingProblemSolution,
    LandingFeatures,
    LandingHowItWorks,
    LandingGuidedTourSection,
    LandingTestimonials,
    LandingFAQ,
    LandingFooter,
    TranslatePipe,
  ],
  templateUrl: './landing-page.html',
})
export class LandingPage implements OnDestroy {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly themeService = inject(ThemeService);

  readonly navLinks = ['features', 'how_it_works', 'testimonials', 'faq'];

  readonly isScrolled = signal(false);
  readonly isMobileMenuOpen = signal(false);

  private readonly handleScroll = () => this.isScrolled.set(window.scrollY > 20);

  constructor() {
    window.addEventListener('scroll', this.handleScroll);
    // The landing page is public, but the CTA label depends on whether a stored
    // token is still valid — kick off the same restore the guards use.
    this.auth.restoreSession().pipe(takeUntilDestroyed()).subscribe();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.handleScroll);
  }

  private readonly isRtl = computed(() => this.i18n.language() === 'ar');

  private readonly isDarkMode = computed(() => {
    const theme = this.themeService.theme();
    return (
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  readonly ctaLabel = computed(() =>
    this.auth.token()
      ? this.i18n.t('nav.dashboard', 'Dashboard')
      : this.i18n.t('landing.nav.login')
  );

  readonly navClass = computed(() =>
    this.isScrolled()
      ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-slate-200 dark:border-slate-800 py-2 shadow-sm'
      : 'bg-transparent border-transparent py-4'
  );

  readonly logoSrc = computed(() => {
    if (this.isDarkMode()) {
      return this.isRtl() ? '/baserah-ar-white.png' : '/baserah-white.png';
    }
    return this.isRtl() ? '/baserah-ar.png' : '/baserah.png';
  });

  /** Height only — the rest of the logo styling is static in the template. */
  readonly logoClass = computed(() => {
    if (this.isRtl()) return this.isScrolled() ? 'h-22 md:h-16' : 'h-24 md:h-24';
    if (this.isDarkMode()) {
      return this.isScrolled() ? 'h-10 md:h-24' : 'h-12 md:h-12';
    }
    return this.isScrolled() ? 'h-20 md:h-20' : 'h-12 md:h-12';
  });

  goToApp(): void {
    this.isMobileMenuOpen.set(false);
    this.router.navigate([this.auth.token() ? '/app/dashboard' : '/auth']);
  }
}
