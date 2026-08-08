import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '@/shared/components/icon/icon';
import { RevealDirective } from '@/shared/directives/reveal.directive';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `landing/LandingProblemSolution.tsx`. */
@Component({
  selector: 'app-landing-problem-solution',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RevealDirective, TranslatePipe],
  templateUrl: './landing-problem-solution.html',
})
export class LandingProblemSolution {
  readonly items = [1, 2, 3, 4];
}
