import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';

/**
 * Port of `ui/tabs.tsx` (Radix Tabs) — the root that owns the selected value.
 *
 * Triggers and panels read it by injecting the parent, which mirrors how the
 * Radix context worked.
 */
@Component({
  selector: 'app-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
  template: '<ng-content />',
})
export class Tabs {
  readonly value = input<string>('');
  readonly valueChange = output<string>();

  private readonly authored = authoredClasses();
  private readonly internal = signal<string | null>(null);

  /** Uncontrolled fallback so a caller may omit [value] entirely. */
  readonly active = computed(() => this.internal() ?? this.value());

  readonly classes = computed(() => cn(this.authored));

  select(value: string): void {
    this.internal.set(value);
    this.valueChange.emit(value);
  }
}
