import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '@/services/i18n.service';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';
import { RevealDirective } from '@/shared/directives/reveal.directive';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

interface TourFeature {
  icon: IconName;
  iconClass: string;
  color: string;
  key: string;
}

/** Port of `landing/LandingGuidedTourSection.tsx`. */
@Component({
  selector: 'app-landing-guided-tour-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RevealDirective, TranslatePipe],
  templateUrl: './landing-guided-tour-section.html',
})
export class LandingGuidedTourSection {
  private readonly i18n = inject(I18nService);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');
  readonly dots = [1, 2, 3, 4, 5];

  readonly features: TourFeature[] = [
    {
      icon: 'Compass',
      iconClass: 'w-8 h-8 text-blue-500',
      color: 'bg-blue-500/10',
      key: 'landing.tour.item1',
    },
    {
      icon: 'Target',
      iconClass: 'w-8 h-8 text-indigo-500',
      color: 'bg-indigo-500/10',
      key: 'landing.tour.item2',
    },
    {
      icon: 'Sparkles',
      iconClass: 'w-8 h-8 text-purple-500',
      color: 'bg-purple-500/10',
      key: 'landing.tour.item3',
    },
  ];
}
