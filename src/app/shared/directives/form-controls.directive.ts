import { Directive, computed, input } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';

/** Ports of `ui/input.tsx`, `ui/textarea.tsx`, `ui/label.tsx`, `ui/badge.tsx`. */

@Directive({
  selector: 'input[appInput]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class InputDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      this.authored
    )
  );
}

@Directive({
  selector: 'textarea[appTextarea]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class TextareaDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn(
      'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      this.authored
    )
  );
}

@Directive({
  selector: 'label[appLabel]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class LabelDirective {
  private readonly authored = authoredClasses();
  readonly classes = computed(() =>
    cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      this.authored
    )
  );
}

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type BadgeVariant = NonNullable<
  VariantProps<typeof badgeVariants>['variant']
>;

@Directive({
  selector: '[appBadge]',
  standalone: true,
  host: { '[class]': 'classes()' },
})
export class BadgeDirective {
  readonly variant = input<BadgeVariant>('default');

  private readonly authored = authoredClasses();

  readonly classes = computed(() =>
    cn(badgeVariants({ variant: this.variant() }), this.authored)
  );
}
