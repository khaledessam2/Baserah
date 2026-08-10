import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

/**
 * Port of `ui/select.tsx` (Radix Select) — the root that owns open state and
 * the value/label registry.
 *
 * The item list stays mounted and is toggled with `hidden` rather than being
 * created on open. Items register their own label with the root after each
 * render, and `<app-select-value>` needs those labels to render the closed
 * state — keeping them mounted is what makes the trigger show a label before
 * first open.
 */
@Component({
  selector: 'app-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block',
    '(keydown.escape)': 'close()',
  },
  template: '<ng-content />',
})
export class Select implements OnDestroy {
  readonly value = input<string>('');
  readonly valueChange = output<string>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly labels = signal(new Map<string, string>());
  private readonly openState = signal(false);

  readonly open = this.openState.asReadonly();
  readonly selectedLabel = computed(() => this.labels().get(this.value()) ?? '');

  private readonly onDocumentPointerDown = (event: PointerEvent) => {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  };

  ngOnDestroy(): void {
    document.removeEventListener('pointerdown', this.onDocumentPointerDown);
  }

  toggle(): void {
    this.openState() ? this.close() : this.openMenu();
  }

  openMenu(): void {
    this.openState.set(true);
    document.addEventListener('pointerdown', this.onDocumentPointerDown);
  }

  close(): void {
    this.openState.set(false);
    document.removeEventListener('pointerdown', this.onDocumentPointerDown);
  }

  select(value: string): void {
    this.valueChange.emit(value);
    this.close();
  }

  registerItem(value: string, label: string): void {
    this.labels.update((prev) => {
      if (prev.get(value) === label) return prev;
      const next = new Map(prev);
      next.set(value, label);
      return next;
    });
  }
}
