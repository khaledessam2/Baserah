import { Directive, computed } from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';

/** Port of `components/ui/card.tsx` — all six parts are class-only. */

@Directive({
  selector: '[appCard]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class CardDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn('rounded-xl border bg-card text-card-foreground shadow-sm', this.authored)
  );
}

@Directive({
  selector: '[appCardHeader]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class CardHeaderDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn('flex flex-col space-y-1.5 p-6', this.authored)
  );
}

@Directive({
  selector: '[appCardTitle]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class CardTitleDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn('text-2xl font-semibold leading-none tracking-tight', this.authored)
  );
}

@Directive({
  selector: '[appCardDescription]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class CardDescriptionDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn('text-sm text-muted-foreground', this.authored)
  );
}

@Directive({
  selector: '[appCardContent]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class CardContentDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() => cn('p-6 pt-0', this.authored));
}

@Directive({
  selector: '[appCardFooter]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class CardFooterDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn('flex items-center p-6 pt-0', this.authored)
  );
}

export const CARD_DIRECTIVES = [
  CardDirective,
  CardHeaderDirective,
  CardTitleDirective,
  CardDescriptionDirective,
  CardContentDirective,
  CardFooterDirective,
] as const;
