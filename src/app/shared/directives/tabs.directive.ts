import { Directive } from '@angular/core';

@Directive({
  selector: '[appTabsList]',
  standalone: true,
  host: { role: 'tablist', class: 'tabs-list' },
})
export class TabsListDirective {}
