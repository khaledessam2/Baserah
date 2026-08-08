import { Directive, computed } from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';

@Directive({
  selector: '[appSelectLabel]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class SelectLabelDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn('px-2 py-1.5 text-sm font-semibold', this.authored)
  );
}

@Directive({
  selector: '[appSelectSeparator]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class SelectSeparatorDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() => cn('-mx-1 my-1 h-px bg-muted', this.authored));
}
