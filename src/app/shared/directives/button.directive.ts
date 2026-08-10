import { Directive, computed, input } from '@angular/core';

/**
 * Port of `components/ui/button.tsx`.
 *
 * The variant/size look lives in `@layer components` in styles.css as
 * `.btn-*` / `.btn-size-*`; this directive only picks the names. Because those
 * classes sit in an earlier layer than Tailwind's utilities, a caller's
 * `class="h-16 rounded-2xl"` overrides them without any class merging here.
 */

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'gradient';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

@Directive({
  selector: '[appButton]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class ButtonDirective {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('default');

  readonly classes = computed(
    () => `btn btn-${this.variant()} btn-size-${this.size()}`
  );
}
