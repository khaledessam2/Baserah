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

import type { CompetencyData } from '@/models/competency.model';

/** Port of `AddCompetencyModal`. */
@Component({
  selector: 'app-add-competency-modal',
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
  templateUrl: './add-competency-modal.html',
})
export class AddCompetencyModal {
  readonly isOpen = input(false);

  readonly closed = output<void>();
  readonly added = output<CompetencyData>();

  readonly parseInt = Number.parseInt;
  readonly parseFloat = Number.parseFloat;

  readonly competencyName = signal('');
  readonly competencyType = signal('core_competency');
  readonly priorityScore = signal(3);
  readonly weight = signal(10);
  readonly skills = signal<string[]>([]);
  readonly newSkill = signal('');
  readonly isSaving = signal(false);

  handleAddSkill(): void {
    if (this.newSkill().trim()) {
      this.skills.update((prev) => [...prev, this.newSkill().trim()]);
      this.newSkill.set('');
    }
  }

  removeSkill(index: number): void {
    this.skills.update((prev) => prev.filter((_, i) => i !== index));
  }

  handleSave(): void {
    if (!this.competencyName()) return;
    this.isSaving.set(true);
    try {
      this.added.emit({
        competency_name: this.competencyName(),
        competency_type: this.competencyType(),
        priority_score: this.priorityScore(),
        weight: this.weight(),
        skills: this.skills(),
        confidence_score: 0.8,
      });
      this.closed.emit();
      // Reset form
      this.competencyName.set('');
      this.competencyType.set('core_competency');
      this.priorityScore.set(3);
      this.weight.set(10);
      this.skills.set([]);
    } catch (error) {
      console.error(error);
    } finally {
      this.isSaving.set(false);
    }
  }
}
