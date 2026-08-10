import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';
import { Select } from '../select';

@Component({
  selector: 'app-select-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[hidden]': '!select.open()',
  },
  templateUrl: './select-content.html',
})
export class SelectContent {
  readonly select = inject(Select);

  private readonly authored = authoredClasses();

  readonly classes = computed(() =>
    cn(
      'absolute z-50 mt-1 max-h-96 min-w-[8rem] w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 slide-in-from-top-2',
      this.authored
    )
  );
}
