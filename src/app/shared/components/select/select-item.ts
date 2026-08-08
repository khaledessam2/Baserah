import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
} from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { authoredClasses } from '@/shared/utils/host-class';
import { Icon } from '@/shared/components/icon/icon';
import { Select } from './select';

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
export class SelectItem implements OnInit {
  readonly value = input.required<string>();
  readonly disabled = input(false);

  private readonly select = inject(Select);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly authored = authoredClasses();

  readonly isSelected = computed(() => this.select.value() === this.value());

  readonly classes = computed(() =>
    cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      this.authored
    )
  );

  ngOnInit(): void {
    // Projected text is in place by now; this is what the trigger displays.
    const label = (this.host.nativeElement.textContent ?? '').trim();
    this.select.registerItem(this.value(), label);
  }

  onClick(): void {
    if (this.disabled()) return;
    this.select.select(this.value());
  }
}
