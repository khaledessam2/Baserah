import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from '@/shared/directives/button.directive';
import {
  Dialog,
  DialogFooterDirective,
  DialogHeaderDirective,
  DialogTitleDirective,
} from '@/shared/components/dialog';
import {
  BadgeDirective,
  InputDirective,
  LabelDirective,
  TextareaDirective,
} from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { SELECT_DIRECTIVES } from '@/shared/components/select';

/** Port of `EditJobDescriptionModal` in `competencies/CompetencyModals.tsx`. */
@Component({
  selector: 'app-edit-job-description-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    Dialog,
    DialogHeaderDirective,
    DialogTitleDirective,
    DialogFooterDirective,
    ButtonDirective,
    TextareaDirective,
    Icon,
  ],
  templateUrl: './edit-job-description-modal.html',
})
export class EditJobDescriptionModal {
  readonly isOpen = input(false);
  readonly currentDescription = input('');

  readonly closed = output<void>();
  readonly saved = output<string>();

  readonly description = signal('');
  readonly isSaving = signal(false);

  constructor() {
    effect(() => {
      this.isOpen();
      this.description.set(this.currentDescription());
    });
  }

  handleSave(): void {
    this.isSaving.set(true);
    try {
      this.saved.emit(this.description());
      this.closed.emit();
    } catch (error) {
      console.error(error);
    } finally {
      this.isSaving.set(false);
    }
  }
}
