import { Directive } from '@angular/core';

@Directive({
  selector: '[appSelectLabel]',
  standalone: true,
  host: { class: 'select-label' },
})
export class SelectLabelDirective {}

@Directive({
  selector: '[appSelectSeparator]',
  standalone: true,
  host: { class: 'select-separator' },
})
export class SelectSeparatorDirective {}
