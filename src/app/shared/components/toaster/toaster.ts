import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@/services/toast.service';
import { Icon } from '@/shared/components/icon/icon';

/** Port of the rendering half of `ui/use-toast.tsx`; state lives in ToastService. */
@Component({
  selector: 'app-toaster',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './toaster.html',
})
export class Toaster {
  readonly toasts = inject(ToastService);
}
