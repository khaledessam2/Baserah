import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';
import { Icon } from '@/shared/components/icon/icon';
import { Select } from '../select';

@Component({
  selector: 'app-select-trigger',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  // `display: block` lives in styles, not a host `class`. A static host class is
  // on the element before `authoredClasses()` reads it, so `block` would be
  // swept into the authored string and `cn()` would drop the button's `flex`
  // as a conflicting display utility — stacking the chevron under the label.
  styles: `
    :host {
      display: block;
    }
  `,
  templateUrl: './select-trigger.html',
})
export class SelectTrigger {
  readonly select = inject(Select);

  private readonly authored = authoredClasses();

  readonly classes = computed(() =>
    cn(
      'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
      this.authored
    )
  );
}
