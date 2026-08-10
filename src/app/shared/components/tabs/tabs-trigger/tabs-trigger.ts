import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Tabs } from '../tabs';

@Component({
  selector: 'button[appTabsTrigger]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    type: 'button',
    role: 'tab',
    class: 'tabs-trigger',
    '[attr.data-state]': 'state()',
    '[attr.aria-selected]': 'isActive()',
    '(click)': 'tabs.select(value())',
  },
  templateUrl: './tabs-trigger.html',
})
export class TabsTrigger {
  readonly value = input.required<string>();
  readonly tabs = inject(Tabs);

  readonly isActive = computed(() => this.tabs.active() === this.value());
  readonly state = computed(() => (this.isActive() ? 'active' : 'inactive'));
}
