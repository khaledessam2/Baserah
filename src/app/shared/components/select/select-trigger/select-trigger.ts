import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from '@/shared/components/icon/icon';
import { Select } from '../select';

@Component({
  selector: 'app-select-trigger',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  // The look sits on the inner <button> (`.select-trigger`), so the host needs a
  // display of its own or it would collapse around it.
  styles: `
    :host {
      display: block;
    }
  `,
  templateUrl: './select-trigger.html',
})
export class SelectTrigger {
  readonly select = inject(Select);
}
