import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '@/services/i18n.service';
import { ThemeService } from '@/services/theme.service';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { Icon } from '@/shared/components/icon/icon';
import { RevealDirective } from '@/shared/directives/reveal.directive';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/**
 * Port of `landing/LandingHero.tsx`.
 *
 * framer-motion's stagger container becomes `appReveal` with incremental
 * delays. The hero art now loads from `/assets/…` — the original pointed at
 * `/src/assets/…`, which only resolves under the Vite dev server.
 */
@Component({
  selector: 'app-landing-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, Icon, RevealDirective, TranslatePipe],
  templateUrl: './landing-hero.html',
})
export class LandingHero {
  readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly themeService = inject(ThemeService);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly isDarkMode = computed(() => {
    const theme = this.themeService.theme();
    return (
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  private readonly title = computed(() => this.i18n.t('landing.hero.title'));
  readonly titleLead = computed(() =>
    this.title().split(' ').slice(0, 3).join(' ')
  );
  readonly titleRest = computed(() => this.title().split(' ').slice(3).join(' '));
}
