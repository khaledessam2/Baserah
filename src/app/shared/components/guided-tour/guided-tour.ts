import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { I18nService } from '@/services/i18n.service';
import { TourService } from '@/services/tour.service';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { Icon } from '@/shared/components/icon/icon';
import type { TourStep } from '@/models/tour.model';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

/**
 * Port of `ui/guided-tour.tsx`.
 *
 * Spotlight mask, viewport-clamped tooltip and the rAF re-sync loop are kept
 * as-is; framer-motion's spring is replaced by a CSS transition on the mask
 * rect and the tooltip box.
 */
@Component({
  selector: 'app-guided-tour',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, Icon],
  templateUrl: './guided-tour.html',
})
export class GuidedTour implements OnDestroy {
  readonly tour = inject(TourService);
  readonly i18n = inject(I18nService);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly currentStepIndex = signal(0);
  private readonly rect = signal<Rect | null>(null);
  private readonly mobile = signal(window.innerWidth < 768);

  readonly targetRect = this.rect.asReadonly();
  readonly isMobile = this.mobile.asReadonly();

  readonly currentStep = computed<TourStep | undefined>(
    () => this.tour.steps()[this.currentStepIndex()]
  );
  readonly isLastStep = computed(
    () => this.currentStepIndex() === this.tour.steps().length - 1
  );

  private frameId?: number;
  private findInterval?: ReturnType<typeof setInterval>;

  private readonly onResize = () => {
    this.mobile.set(window.innerWidth < 768);
    this.updateTargetRect();
  };
  private readonly onScroll = () => this.updateTargetRect();

  constructor() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('scroll', this.onScroll, { passive: true });

    // Reset to the first step whenever the tour opens.
    effect(() => {
      if (this.tour.isOpen()) this.currentStepIndex.set(0);
    });

    // Scroll the target into view, retrying while the page settles.
    effect(() => {
      const step = this.currentStep();
      const open = this.tour.isOpen();
      this.clearFindInterval();
      if (!open || !step) return;

      let retries = 0;
      const maxRetries = 20; // Try for 2 seconds

      const findAndScroll = (): boolean => {
        const element = document.querySelector(step.target);
        if (element instanceof HTMLElement) {
          // Use center to avoid fixed headers/bottom-sheets
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          this.updateTargetRect();
          setTimeout(() => this.updateTargetRect(), 500);
          return true;
        }
        return false;
      };

      if (!findAndScroll()) {
        this.findInterval = setInterval(() => {
          retries++;
          if (findAndScroll() || retries >= maxRetries) {
            this.clearFindInterval();
          }
        }, 100);
      }
    });

    // Tight sync loop for positioning.
    effect(() => {
      const open = this.tour.isOpen();
      this.cancelFrame();
      if (!open) return;

      const sync = () => {
        this.updateTargetRect();
        this.frameId = requestAnimationFrame(sync);
      };
      this.frameId = requestAnimationFrame(sync);
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.onScroll);
    this.cancelFrame();
    this.clearFindInterval();
  }

  handleNext(): void {
    if (this.currentStepIndex() < this.tour.steps().length - 1) {
      this.currentStepIndex.update((i) => i + 1);
    } else {
      this.tour.closeTour();
    }
  }

  handleBack(): void {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.update((i) => i - 1);
    }
  }

  dotClass(index: number): string {
    return index === this.currentStepIndex()
      ? 'w-8 md:w-12 bg-primary shadow-[0_0_20px_rgba(37,99,235,0.4)]'
      : 'w-2 md:w-3 bg-slate-200 dark:bg-slate-700';
  }

  readonly effectivePlacement = computed<'top' | 'bottom' | 'left' | 'right'>(
    () => {
      const p = this.currentStep()?.placement || 'bottom';
      if (this.isRtl()) {
        if (p === 'left') return 'right';
        if (p === 'right') return 'left';
      }
      return p;
    }
  );

  /** The four placements are mutually exclusive, so exactly one string wins. */
  arrowClass(): string {
    switch (this.effectivePlacement()) {
      case 'top':
        return 'bottom-[-10px] left-1/2 -translate-x-1/2 border-b border-r border-slate-200 dark:border-slate-800';
      case 'bottom':
        return 'top-[-10px] left-1/2 -translate-x-1/2 border-t border-l border-slate-200 dark:border-slate-800';
      case 'left':
        return 'right-[-10px] top-1/2 -translate-y-1/2 border-t border-r border-slate-200 dark:border-slate-800';
      case 'right':
        return 'left-[-10px] top-1/2 -translate-y-1/2 border-b border-l border-slate-200 dark:border-slate-800';
    }
  }

  readonly tooltipStyles = computed(() => {
    if (this.mobile()) {
      return {
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        right: '20px',
        top: 'auto',
        width: 'calc(100% - 40px)',
        'max-width': 'none',
        transform: 'none',
        'z-index': '10005',
      } as Record<string, string>;
    }

    const rect = this.rect();
    if (!rect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        'z-index': '10005',
      } as Record<string, string>;
    }

    const padding = 12;
    const { top, left, width, height, bottom, right } = rect;
    const placement = this.effectivePlacement();

    let styleTop: number | 'auto' = 'auto';
    let styleBottom: number | 'auto' = 'auto';
    let styleLeft: number | 'auto' = 'auto';
    let styleRight: number | 'auto' = 'auto';

    switch (placement) {
      case 'top':
        styleBottom = window.innerHeight - top + padding;
        styleLeft = left + width / 2;
        break;
      case 'bottom':
        styleTop = bottom + padding;
        styleLeft = left + width / 2;
        break;
      case 'left':
        styleTop = top + height / 2;
        styleRight = window.innerWidth - left + padding;
        break;
      case 'right':
        styleTop = top + height / 2;
        styleLeft = right + padding;
        break;
    }

    // Boundary check to keep tooltip inside viewport
    const tooltipWidth = 480;
    const tooltipHeight = 350; // Estimated max height

    if (styleLeft !== 'auto') {
      if (styleLeft - tooltipWidth / 2 < 20) styleLeft = tooltipWidth / 2 + 20;
      if (styleLeft + tooltipWidth / 2 > window.innerWidth - 20) {
        styleLeft = window.innerWidth - tooltipWidth / 2 - 20;
      }
    }
    if (styleRight !== 'auto') {
      if (styleRight < 20) styleRight = 20;
    }
    if (styleTop !== 'auto') {
      if (styleTop + tooltipHeight > window.innerHeight - 20) {
        styleTop = Math.max(20, window.innerHeight - tooltipHeight - 20);
      }
      if (styleTop < 20) styleTop = 20;
    }
    if (styleBottom !== 'auto') {
      if (styleBottom + tooltipHeight > window.innerHeight - 20) {
        styleBottom = Math.max(20, window.innerHeight - tooltipHeight - 20);
      }
      if (styleBottom < 20) styleBottom = 20;
    }

    // Centre the box on the anchor point the same way the motion `x`/`y`
    // percentage offsets did.
    const translateX =
      placement === 'top' || placement === 'bottom' ? '-50%' : '0';
    const translateY =
      placement === 'left' || placement === 'right' ? '-50%' : '0';

    const styles: Record<string, string> = {
      position: 'fixed',
      transform: `translate(${translateX}, ${translateY})`,
      'transform-origin': 'center',
      'z-index': '10005',
    };
    styles['top'] = styleTop === 'auto' ? 'auto' : `${styleTop}px`;
    styles['bottom'] = styleBottom === 'auto' ? 'auto' : `${styleBottom}px`;
    styles['left'] = styleLeft === 'auto' ? 'auto' : `${styleLeft}px`;
    styles['right'] = styleRight === 'auto' ? 'auto' : `${styleRight}px`;
    return styles;
  });

  private updateTargetRect(): void {
    const step = this.currentStep();
    if (!step) return;

    const element = document.querySelector(step.target);
    if (element && element.getClientRects().length > 0) {
      const next = element.getBoundingClientRect();
      const prev = this.rect();
      // Only update if the rect actually moved, so the rAF loop does not
      // re-render on every frame.
      if (
        prev &&
        Math.abs(prev.top - next.top) < 0.5 &&
        Math.abs(prev.left - next.left) < 0.5 &&
        Math.abs(prev.width - next.width) < 0.5 &&
        Math.abs(prev.height - next.height) < 0.5
      ) {
        return;
      }
      this.rect.set({
        top: next.top,
        left: next.left,
        width: next.width,
        height: next.height,
        bottom: next.bottom,
        right: next.right,
      });
    } else if (this.rect() !== null) {
      this.rect.set(null);
    }
  }

  private cancelFrame(): void {
    if (this.frameId !== undefined) {
      cancelAnimationFrame(this.frameId);
      this.frameId = undefined;
    }
  }

  private clearFindInterval(): void {
    if (this.findInterval !== undefined) {
      clearInterval(this.findInterval);
      this.findInterval = undefined;
    }
  }
}
