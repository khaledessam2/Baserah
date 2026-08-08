import { Directive, computed } from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';

@Directive({
  selector: '[appDialogHeader]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class DialogHeaderDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn('flex flex-col space-y-1.5 text-center sm:text-left', this.authored)
  );
}

@Directive({
  selector: '[appDialogFooter]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class DialogFooterDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      this.authored
    )
  );
}

@Directive({
  selector: '[appDialogTitle]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class DialogTitleDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn('text-lg font-semibold leading-none tracking-tight', this.authored)
  );
}

@Directive({
  selector: '[appDialogDescription]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class DialogDescriptionDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn('text-sm text-muted-foreground', this.authored)
  );
}
