import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/** Port of `ui/progress.tsx` (Radix Progress). */
@Component({
  selector: 'app-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'progressbar',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'value()',
    class: 'progress',
  },
  templateUrl: './progress.html',
})
export class Progress {
  readonly value = input<number | null | undefined>(0);
  readonly max = input<number>(100);

  readonly percentage = computed(() => {
    const raw = this.value() ?? 0;
    return Math.min(100, Math.max(0, raw));
  });
}
