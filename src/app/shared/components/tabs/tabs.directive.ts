import { Directive, computed } from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';

@Directive({
  selector: '[appTabsList]',
  standalone: true,
  host: { role: 'tablist', '[class]': 'classes()' },
})
export class TabsListDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn(
      'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
      this.authored
    )
  );
}
