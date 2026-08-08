import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { ICONS, type IconName } from '@/shared/icons/icons';

/** Loose on purpose: lucide's own `SVGProps` allows undefined values. */
type Attrs = Record<string, string | number | undefined>;

/**
 * Replacement for `lucide-react`'s per-icon components.
 *
 * `lucide-angular` still caps its peer range at Angular 21, so icons are drawn
 * from the framework-agnostic `lucide` package instead. The node list only ever
 * uses six SVG shapes, so they are rendered declaratively — no innerHTML and no
 * sanitizer bypass.
 *
 *   <app-icon name="Send" class="w-4 h-4" />
 *   <app-icon name="X" [size]="24" />
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex shrink-0',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
  // `fill: inherit` lets a Tailwind `fill-*` class on the host reach the shapes —
  // several call sites style icons that way (filled priority stars, for one).
  // The unfilled default comes from the low-specificity `app-icon` rule in
  // styles.css, which a `fill-*` utility class outranks.
  styles: `
    svg {
      fill: inherit;
    }
  `,
  templateUrl: './icon.html',
})
export class Icon {
  readonly name = input.required<IconName>();
  /** Pixel size. Omit to inherit the box set by Tailwind classes (w-4 h-4 …). */
  readonly size = input<number | undefined>(undefined);
  readonly strokeWidth = input<number>(2);

  readonly nodes = computed(() => ICONS[this.name()]);

  attr(attrs: Attrs, key: string): string | number | null {
    return attrs[key] ?? null;
  }
}
