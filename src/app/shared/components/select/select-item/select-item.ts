import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterEveryRender,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';
import { Icon } from '@/shared/components/icon/icon';
import { Select } from '../select';

@Component({
  selector: 'app-select-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: {
    role: 'option',
    '[attr.aria-selected]': 'isSelected()',
    '[attr.data-disabled]': 'disabled() || null',
    '[class]': 'classes()',
    '(click)': 'onClick()',
  },
  templateUrl: './select-item.html',
})
export class SelectItem {
  readonly value = input.required<string>();
  readonly disabled = input(false);

  private readonly select = inject(Select);
  private readonly label = viewChild<ElementRef<HTMLElement>>('label');
  private readonly authored = authoredClasses();

  readonly isSelected = computed(() => this.select.value() === this.value());

  readonly classes = computed(() =>
    cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      this.authored
    )
  );

  constructor() {
    // The label is projected text owned by the *parent* view, and it is usually
    // an impure binding (`{{ 'analyzer.level_mid' | t }}`). Reading it once from
    // `ngOnInit` ran before that text existed, so the trigger registered an
    // empty label and fell back to its placeholder; it also never picked up a
    // language switch. `afterEveryRender` reads the settled DOM on every pass,
    // and `registerItem` is a no-op when the label is unchanged.
    afterEveryRender({
      read: () => {
        const text = (this.label()?.nativeElement.textContent ?? '').trim();
        if (text) this.select.registerItem(this.value(), text);
      },
    });
  }

  onClick(): void {
    if (this.disabled()) return;
    this.select.select(this.value());
  }
}
