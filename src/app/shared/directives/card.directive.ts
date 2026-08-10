import { Directive } from '@angular/core';

/**
 * Port of `components/ui/card.tsx` — all six parts are class-only.
 *
 * Each part contributes one static host class and nothing else. Angular merges
 * a static host class with whatever the element was authored with, and the
 * classes live in `@layer components`, so a caller's `class="rounded-3xl p-0"`
 * outranks the base look on cascade order alone.
 */

@Directive({
  selector: '[appCard]',
  standalone: true,
  host: { class: 'card' },
})
export class CardDirective {}

@Directive({
  selector: '[appCardHeader]',
  standalone: true,
  host: { class: 'card-header' },
})
export class CardHeaderDirective {}

@Directive({
  selector: '[appCardTitle]',
  standalone: true,
  host: { class: 'card-title' },
})
export class CardTitleDirective {}

@Directive({
  selector: '[appCardDescription]',
  standalone: true,
  host: { class: 'card-description' },
})
export class CardDescriptionDirective {}

@Directive({
  selector: '[appCardContent]',
  standalone: true,
  host: { class: 'card-content' },
})
export class CardContentDirective {}

@Directive({
  selector: '[appCardFooter]',
  standalone: true,
  host: { class: 'card-footer' },
})
export class CardFooterDirective {}

export const CARD_DIRECTIVES = [
  CardDirective,
  CardHeaderDirective,
  CardTitleDirective,
  CardDescriptionDirective,
  CardContentDirective,
  CardFooterDirective,
] as const;
