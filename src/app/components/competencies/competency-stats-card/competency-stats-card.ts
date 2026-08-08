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
import type { IconName } from '@/shared/icons/icons';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of the `StatsCard` helper in `JobTitleCompetenciesPage.tsx`. */
@Component({
  selector: 'app-competency-stats-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './competency-stats-card.html',
})
export class CompetencyStatsCard {
  readonly label = input.required<string>();
  readonly count = input.required<number>();
  readonly colorClass = input.required<string>();

  readonly classes = computed(() =>
    cn(
      'p-6 rounded-2xl text-white shadow-lg relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-transform',
      this.colorClass()
    )
  );
}
