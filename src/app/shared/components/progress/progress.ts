import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';

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
    '[class]': 'classes()',
  },
  templateUrl: './progress.html',
})
export class Progress {
  readonly value = input<number | null | undefined>(0);
  readonly max = input<number>(100);

  private readonly authored = authoredClasses();

  readonly percentage = computed(() => {
    const raw = this.value() ?? 0;
    return Math.min(100, Math.max(0, raw));
  });

  readonly classes = computed(() =>
    cn(
      'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
      this.authored
    )
  );
}
