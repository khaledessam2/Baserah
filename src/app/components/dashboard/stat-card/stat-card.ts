import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CARD_DIRECTIVES } from '@/shared/directives/card.directive';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';

const COLOR_MAP: Record<string, string> = {
  indigo: 'from-indigo-500 to-indigo-600',
  green: 'from-green-500 to-emerald-600',
  blue: 'from-blue-500 to-cyan-600',
  purple: 'from-purple-500 to-violet-600',
};

/** Port of the `StatCard` helper in `pages/EmployeesPage.tsx`. */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...CARD_DIRECTIVES, Icon],
  templateUrl: './stat-card.html',
})
export class StatCard {
  readonly title = input.required<string>();
  readonly value = input.required<number>();
  readonly icon = input.required<IconName>();
  readonly color = input.required<string>();

  private readonly gradient = computed(() => COLOR_MAP[this.color()] ?? '');

  readonly iconWrapClass = computed(
    () =>
      `w-10 h-10 rounded-xl bg-linear-to-br ${this.gradient()} flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110`
  );

  readonly underlineClass = computed(
    () =>
      `absolute bottom-0 right-0 left-0 h-1 bg-linear-to-r ${this.gradient()} opacity-50`
  );
}
