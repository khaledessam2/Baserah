import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';
import { Tabs } from '../tabs';

@Component({
  selector: 'button[appTabsTrigger]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    type: 'button',
    role: 'tab',
    '[class]': 'classes()',
    '[attr.data-state]': 'state()',
    '[attr.aria-selected]': 'isActive()',
    '(click)': 'tabs.select(value())',
  },
  templateUrl: './tabs-trigger.html',
})
export class TabsTrigger {
  readonly value = input.required<string>();
  readonly tabs = inject(Tabs);

  private readonly authored = authoredClasses();

  readonly isActive = computed(() => this.tabs.active() === this.value());
  readonly state = computed(() => (this.isActive() ? 'active' : 'inactive'));

  readonly classes = computed(() =>
    cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
      this.authored
    )
  );
}
