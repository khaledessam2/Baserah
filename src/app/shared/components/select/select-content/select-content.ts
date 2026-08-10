import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Select } from '../select';

@Component({
  selector: 'app-select-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'select-content animate-in fade-in-0 zoom-in-95 slide-in-from-top-2',
    '[hidden]': '!select.open()',
  },
  templateUrl: './select-content.html',
})
export class SelectContent {
  readonly select = inject(Select);
}
