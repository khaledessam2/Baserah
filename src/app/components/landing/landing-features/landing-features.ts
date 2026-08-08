import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';
import { RevealDirective } from '@/shared/directives/reveal.directive';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

interface Feature {
  icon: IconName;
  iconClass: string;
  key: string;
}

/** Port of `landing/LandingFeatures.tsx`. */
@Component({
  selector: 'app-landing-features',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RevealDirective, TranslatePipe],
  templateUrl: './landing-features.html',
})
export class LandingFeatures {
  readonly features: Feature[] = [
    {
      icon: 'BrainCircuit',
      iconClass: 'w-8 h-8 text-blue-500',
      key: 'landing.features.item1',
    },
    {
      icon: 'Network',
      iconClass: 'w-8 h-8 text-purple-500',
      key: 'landing.features.item2',
    },
    {
      icon: 'ClipboardCheck',
      iconClass: 'w-8 h-8 text-teal-500',
      key: 'landing.features.item3',
    },
    {
      icon: 'BarChart3',
      iconClass: 'w-8 h-8 text-orange-500',
      key: 'landing.features.item4',
    },
    {
      icon: 'Languages',
      iconClass: 'w-8 h-8 text-pink-500',
      key: 'landing.features.item5',
    },
    {
      icon: 'ShieldCheck',
      iconClass: 'w-8 h-8 text-green-500',
      key: 'landing.features.item6',
    },
  ];
}
