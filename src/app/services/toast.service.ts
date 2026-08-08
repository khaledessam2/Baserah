import { Injectable, signal } from '@angular/core';
import type { ToastType, Toast } from '@/models/toast.model';

/** Port of `components/ui/use-toast.tsx` — the provider's state half. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<Toast[]>([]);

  readonly toasts = this.items.asReadonly();

  toast(message: string, type: ToastType = 'info'): void {
    const id = Math.random().toString(36).substring(2, 9);
    this.items.update((prev) => [...prev, { id, message, type }]);
    setTimeout(() => this.remove(id), 3000);
  }

  remove(id: string): void {
    this.items.update((prev) => prev.filter((t) => t.id !== id));
  }
}
