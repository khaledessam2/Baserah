import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '@/shared/directives/reveal.directive';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `landing/LandingHowItWorks.tsx`. */
@Component({
  selector: 'app-landing-how-it-works',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, TranslatePipe],
  templateUrl: './landing-how-it-works.html',
})
export class LandingHowItWorks {
  readonly steps = [
    'landing.how_it_works.step1',
    'landing.how_it_works.step2',
    'landing.how_it_works.step3',
    'landing.how_it_works.step4',
  ];
}
