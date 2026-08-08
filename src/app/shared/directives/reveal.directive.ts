import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  input,
} from '@angular/core';

/**
 * Replacement for framer-motion's `whileInView` fade-up on the landing page.
 *
 * Adds `.reveal` immediately and `.reveal-visible` when the element first
 * scrolls into view; the transition itself lives in styles.css, which also
 * honours `prefers-reduced-motion`.
 *
 *   <div appReveal [revealDelay]="0.2"> … </div>
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  /** Seconds, matching the `transition={{ delay }}` values being replaced. */
  readonly revealDelay = input<number>(0);
  readonly revealOnce = input<boolean>(true);

  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const el = this.host.nativeElement;
    el.classList.add('reveal');
    if (this.revealDelay()) {
      el.style.setProperty('--reveal-delay', `${this.revealDelay()}s`);
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('reveal-visible');
            if (this.revealOnce()) this.observer?.unobserve(el);
          } else if (!this.revealOnce()) {
            el.classList.remove('reveal-visible');
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -80px 0px' }
    );

    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
