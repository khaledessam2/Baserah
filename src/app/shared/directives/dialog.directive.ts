import { Directive } from '@angular/core';

/** Port of `ui/dialog.tsx` — the four sub-parts are class-only. */

@Directive({
  selector: '[appDialogHeader]',
  standalone: true,
  host: { class: 'dialog-header' },
})
export class DialogHeaderDirective {}

@Directive({
  selector: '[appDialogFooter]',
  standalone: true,
  host: { class: 'dialog-footer' },
})
export class DialogFooterDirective {}

@Directive({
  selector: '[appDialogTitle]',
  standalone: true,
  host: { class: 'dialog-title' },
})
export class DialogTitleDirective {}

@Directive({
  selector: '[appDialogDescription]',
  standalone: true,
  host: { class: 'dialog-description' },
})
export class DialogDescriptionDirective {}
