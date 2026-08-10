import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { I18nService } from '@/services/i18n.service';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { BadgeDirective } from '@/shared/directives/form-controls.directive';
import { Icon } from '@/shared/components/icon/icon';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

import type { Competency } from '@/models/competency.model';

/** Port of `CompetencyCard`. */
@Component({
  selector: 'app-competency-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, BadgeDirective, Icon, TranslatePipe],
  templateUrl: './competency-card.html',
})
export class CompetencyCard {
  readonly competency = input.required<Competency>();
  readonly color = input.required<string>();

  readonly edit = output<Competency>();
  readonly delete = output<string>();

  private readonly i18n = inject(I18nService);

  readonly weightPercent = computed(() =>
    Math.round(this.competency().weight * 100)
  );

  readonly confidenceLabel = computed(() => {
    const score = this.competency().confidence_score;
    return score ? `${Math.round(score * 100)}%` : '-';
  });

  readonly visibleSkills = computed(
    () => this.competency().skills?.slice(0, 3) ?? []
  );

  readonly extraSkillCount = computed(() => {
    const length = this.competency().skills?.length ?? 0;
    return length > 3 ? length - 3 : 0;
  });

  readonly editIconClass = computed(() =>
    cn('w-3 h-3', this.i18n.language() === 'ar' ? 'ml-2' : 'mr-2')
  );

  onDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.competency().competency_name);
  }
}
