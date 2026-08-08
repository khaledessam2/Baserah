import { ElementRef, inject } from '@angular/core';

/**
 * Reads the static `class` attribute an element was authored with.
 *
 * shadcn components merged incoming `className` last through `cn()`, so a
 * caller's `px-8` beat the variant's `px-4`. Angular keeps static classes and
 * `[class]` bindings side by side instead, which loses that precedence — so the
 * authored classes are captured here and fed back into `cn()` in last position
 * to restore it.
 *
 * Must be called during construction (field initialiser or constructor body),
 * while the element still only carries its static attributes.
 */
export function authoredClasses(): string {
  return inject(ElementRef<HTMLElement>).nativeElement.getAttribute('class') ?? '';
}
