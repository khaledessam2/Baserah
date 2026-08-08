import { Observable } from 'rxjs';

/**
 * Emits once the browser has actually painted a frame, then completes.
 *
 * Use it before kicking off synchronous work that blocks the main thread. A
 * signal written just before that work (a spinner flag, say) never reaches the
 * screen on its own: change detection updates the DOM, but the blocking work
 * starts before the browser gets a chance to paint it.
 *
 * Two nested `requestAnimationFrame` calls are what makes that guarantee. The
 * first callback runs *before* the paint of the upcoming frame; the second one
 * is queued for the frame after it, so by the time it fires the pending DOM
 * changes are on screen.
 *
 * The work itself still freezes the tab — this only ensures the UI announcing
 * it is visible first.
 */
export function afterPaint(): Observable<void> {
  return new Observable<void>((subscriber) => {
    let innerHandle = 0;
    const outerHandle = requestAnimationFrame(() => {
      innerHandle = requestAnimationFrame(() => {
        subscriber.next();
        subscriber.complete();
      });
    });

    return () => {
      cancelAnimationFrame(outerHandle);
      cancelAnimationFrame(innerHandle);
    };
  });
}
