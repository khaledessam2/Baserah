import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonDirective } from '@/shared/directives/button.directive';
import {
  Dialog,
  DialogDescriptionDirective,
  DialogFooterDirective,
  DialogHeaderDirective,
  DialogTitleDirective,
} from '@/shared/components/dialog';
import { Icon } from '@/shared/components/icon/icon';

/** Port of `ui/confirmation-modal.tsx`. */
@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Dialog,
    DialogHeaderDirective,
    DialogTitleDirective,
    DialogDescriptionDirective,
    DialogFooterDirective,
    ButtonDirective,
    Icon,
  ],
  templateUrl: './confirmation-modal.html',
})
export class ConfirmationModal {
  readonly isOpen = input(false);
  readonly title = input('');
  readonly description = input('');
  readonly confirmText = input('تأكيد');
  readonly cancelText = input('إلغاء');
  readonly variant = input<'danger' | 'default'>('default');

  readonly closed = output<void>();
  readonly confirmed = output<void>();

  confirm(): void {
    this.confirmed.emit();
    this.closed.emit();
  }
}
