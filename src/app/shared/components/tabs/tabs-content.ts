import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';
import { Tabs } from './tabs';

@Component({
  selector: 'app-tabs-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'tabpanel',
    '[class]': 'classes()',
    '[hidden]': '!isActive()',
  },
  templateUrl: './tabs-content.html',
})
export class TabsContent {
  readonly value = input.required<string>();
  private readonly tabs = inject(Tabs);

  private readonly authored = authoredClasses();

  readonly isActive = computed(() => this.tabs.active() === this.value());

  readonly classes = computed(() =>
    cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      this.authored
    )
  );
}
