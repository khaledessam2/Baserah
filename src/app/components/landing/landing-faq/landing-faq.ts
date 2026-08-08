import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '@/shared/components/icon/icon';
import { RevealDirective } from '@/shared/directives/reveal.directive';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `landing/LandingFAQ.tsx`. */
@Component({
  selector: 'app-landing-faq',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RevealDirective, TranslatePipe],
  templateUrl: './landing-faq.html',
})
export class LandingFAQ {
  readonly faqs = [1, 2, 3];
}
