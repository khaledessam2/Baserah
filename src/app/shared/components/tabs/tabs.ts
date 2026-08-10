import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

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
  // No class binding: the root has no look of its own, so whatever the caller
  // authored on <app-tabs> is simply left in place.
  template: '<ng-content />',
})
export class Tabs {
  readonly value = input<string>('');
  readonly valueChange = output<string>();

  private readonly internal = signal<string | null>(null);

  /** Uncontrolled fallback so a caller may omit [value] entirely. */
  readonly active = computed(() => this.internal() ?? this.value());

  select(value: string): void {
    this.internal.set(value);
    this.valueChange.emit(value);
  }
}
