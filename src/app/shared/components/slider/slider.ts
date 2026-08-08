import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';

/**
 * Port of `ui/slider.tsx` (Radix Slider), single-thumb — the only shape the app
 * uses. `data-orientation="horizontal"` is kept because styles.css relies on it
 * to force the track LTR inside an RTL document.
 */
@Component({
  selector: 'app-slider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    'data-orientation': 'horizontal',
    '(pointerdown)': 'onPointerDown($event)',
    '(keydown)': 'onKeyDown($event)',
  },
  templateUrl: './slider.html',
})
export class Slider {
  readonly value = input<number>(0);
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly disabled = input<boolean>(false);
  /** Matches Radix's `onValueChange`, unwrapped to the single thumb. */
  readonly valueChange = output<number>();

  readonly trackClass = input<string>('');
  readonly thumbClass = input<string>('');

  private readonly trackEl = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly dragging = signal(false);

  private readonly authored = authoredClasses();

  readonly classes = computed(() =>
    cn(
      'relative flex w-full touch-none select-none items-center',
      this.authored
    )
  );

  readonly percent = computed(() => {
    const span = this.max() - this.min();
    if (span <= 0) return 0;
    const ratio = (this.value() - this.min()) / span;
    return Math.min(100, Math.max(0, ratio * 100));
  });

  onPointerDown(event: PointerEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.dragging.set(true);
    this.emitFromPointer(event);

    const move = (e: PointerEvent) => {
      if (this.dragging()) this.emitFromPointer(e);
    };
    const up = () => {
      this.dragging.set(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const step = this.step();
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = this.value() + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = this.value() - step;
        break;
      case 'Home':
        next = this.min();
        break;
      case 'End':
        next = this.max();
        break;
      case 'PageUp':
        next = this.value() + step * 10;
        break;
      case 'PageDown':
        next = this.value() - step * 10;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.emit(next);
  }

  private emitFromPointer(event: PointerEvent): void {
    const rect = this.trackEl().nativeElement.getBoundingClientRect();
    if (rect.width === 0) return;
    // The track renders LTR even in RTL documents (see styles.css), so the
    // ratio is always measured from the left edge.
    const ratio = (event.clientX - rect.left) / rect.width;
    this.emit(this.min() + ratio * (this.max() - this.min()));
  }

  private emit(raw: number): void {
    const step = this.step();
    const min = this.min();
    const max = this.max();

    const snapped = step > 0 ? Math.round((raw - min) / step) * step + min : raw;
    const clamped = Math.min(max, Math.max(min, snapped));

    // Re-round to kill float drift from fractional steps (the weights UI
    // uses step 0.1).
    const decimals = (String(step).split('.')[1] ?? '').length;
    const next = Number(clamped.toFixed(decimals));

    if (next !== this.value()) this.valueChange.emit(next);
  }
}
