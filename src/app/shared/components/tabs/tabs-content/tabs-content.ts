import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Tabs } from '../tabs';

@Component({
  selector: 'app-tabs-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'tabpanel',
    class: 'tabs-content',
    '[hidden]': '!isActive()',
  },
  templateUrl: './tabs-content.html',
})
export class TabsContent {
  readonly value = input.required<string>();
  private readonly tabs = inject(Tabs);

  readonly isActive = computed(() => this.tabs.active() === this.value());
}
