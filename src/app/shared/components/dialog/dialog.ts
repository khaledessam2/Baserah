import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  input,
  output,
} from '@angular/core';
import { Icon } from '@/shared/components/icon/icon';

/**
 * Port of `ui/dialog.tsx` (Radix Dialog).
 *
 *   <app-dialog [open]="isOpen()" (openChange)="close()">
 *     <div appDialogContent class="sm:max-w-[425px]"> … </div>
 *   </app-dialog>
 *
 * Rendered inline rather than in a portal: everything it overlays is inside the
 * app root anyway, and `fixed` + `z-50` positions it against the viewport all
 * the same.
 */
@Component({
  selector: 'app-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './dialog.html',
})
export class Dialog implements OnDestroy {
  readonly open = input(false);
  /** Mirrors Radix `onOpenChange` — only ever emits false from within. */
  readonly openChange = output<boolean>();
  readonly contentClass = input<string>('');

  constructor() {
    // Radix locked body scroll while a dialog was up; keep that behaviour.
    effect(() => {
      document.body.style.overflow = this.open() ? 'hidden' : '';
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  requestClose(): void {
    this.openChange.emit(false);
  }
}
