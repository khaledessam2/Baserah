import { Directive, computed, input } from '@angular/core';

/** Ports of `ui/input.tsx`, `ui/textarea.tsx`, `ui/label.tsx`, `ui/badge.tsx`. */

@Directive({
  selector: 'input[appInput]',
  standalone: true,
  host: { class: 'input' },
})
export class InputDirective {}

@Directive({
  selector: 'textarea[appTextarea]',
  standalone: true,
  host: { class: 'textarea' },
})
export class TextareaDirective {}

@Directive({
  selector: 'label[appLabel]',
  standalone: true,
  host: { class: 'label' },
})
export class LabelDirective {}

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline';

@Directive({
  selector: '[appBadge]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class BadgeDirective {
  readonly variant = input<BadgeVariant>('default');

  readonly classes = computed(() => `badge badge-${this.variant()}`);
}
