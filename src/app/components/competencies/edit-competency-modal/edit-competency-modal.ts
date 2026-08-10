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
} from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { SELECT_DIRECTIVES } from '@/shared/components/select';

import type { CompetencyData } from '@/models/competency.model';

/** Port of `EditCompetencyModal`. */
@Component({
  selector: 'app-edit-competency-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    Dialog,
    DialogHeaderDirective,
    DialogTitleDirective,
    DialogFooterDirective,
    ButtonDirective,
    BadgeDirective,
    InputDirective,
    LabelDirective,
    Icon,
    ...SELECT_DIRECTIVES,
  ],
  templateUrl: './edit-competency-modal.html',
})
export class EditCompetencyModal {
  readonly isOpen = input(false);
  readonly competency = input<CompetencyData | null>(null);

  readonly closed = output<void>();
  readonly saved = output<CompetencyData>();

  readonly parseInt = Number.parseInt;

  readonly formData = signal<CompetencyData | null>(null);
  readonly newSkill = signal('');
  readonly isSaving = signal(false);

  constructor() {
    effect(() => {
      this.isOpen();
      const competency = this.competency();
      if (competency) {
        this.formData.set({ ...competency });
      }
    });
  }

  patch(patch: Partial<CompetencyData>): void {
    this.formData.update((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  displayWeight(): number {
    const weight = this.formData()?.weight ?? 0;
    return weight <= 1 ? Math.round(weight * 100) : weight;
  }

  onWeightChange(value: string): void {
    const val = Number.parseFloat(value);
    // Auto convert if user types 50 -> 0.5
    this.patch({ weight: val > 1 ? val / 100 : val });
  }

  handleAddSkill(): void {
    const form = this.formData();
    if (this.newSkill().trim() && form) {
      this.patch({ skills: [...(form.skills || []), this.newSkill().trim()] });
      this.newSkill.set('');
    }
  }

  removeSkill(index: number): void {
    const form = this.formData();
    if (!form) return;
    this.patch({ skills: form.skills.filter((_, i) => i !== index) });
  }

  handleSave(): void {
    const form = this.formData();
    if (!form || !form.competency_name) return;
    this.isSaving.set(true);
    try {
      this.saved.emit(form);
      this.closed.emit();
    } catch (error) {
      console.error(error);
    } finally {
      this.isSaving.set(false);
    }
  }
}
