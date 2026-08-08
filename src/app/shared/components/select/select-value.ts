import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Select } from './select';

@Component({
  selector: 'app-select-value',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './select-value.html',
})
export class SelectValue {
  readonly placeholder = input<string>('');
  readonly select = inject(Select);
}
