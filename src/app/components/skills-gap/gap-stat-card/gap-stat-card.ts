import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';

/** Port of the stat card in `skills-gap/GapBadge.tsx`. */
@Component({
  selector: 'app-gap-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './gap-stat-card.html',
})
export class GapStatCard {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly subtitle = input<string | undefined>(undefined);
  readonly icon = input.required<IconName>();
  readonly iconClass = input('w-5 h-5');
  readonly gradient = input.required<string>();

}
