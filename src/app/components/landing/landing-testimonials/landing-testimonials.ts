import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '@/services/i18n.service';
import { Icon } from '@/shared/components/icon/icon';
import { RevealDirective } from '@/shared/directives/reveal.directive';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `landing/LandingTestimonials.tsx`. */
@Component({
  selector: 'app-landing-testimonials',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RevealDirective, TranslatePipe],
  templateUrl: './landing-testimonials.html',
})
export class LandingTestimonials {
  private readonly i18n = inject(I18nService);

  readonly testimonials = computed(() =>
    [
      { key: 'landing.testimonials.t1', color: 'bg-blue-500' },
      { key: 'landing.testimonials.t2', color: 'bg-purple-500' },
      { key: 'landing.testimonials.t3', color: 'bg-teal-500' },
    ].map(({ key, color }) => {
      const author = this.i18n.t(`${key}.author`);
      return {
        key,
        color,
        author,
        initial: author.charAt(0),
        quote: this.i18n.t(`${key}.quote`),
        role: this.i18n.t(`${key}.role`),
      };
    })
  );
}
