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

import type { Competency } from '@/models/competency.model';
import { CompetencyCard } from '../competency-card/competency-card';

/** Port of `CategorySection`. */
@Component({
  selector: 'app-competency-category-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CompetencyCard, Icon],
  templateUrl: './competency-category-section.html',
})
export class CompetencyCategorySection {
  readonly title = input.required<string>();
  readonly icon = input.required<IconName>();
  readonly items = input.required<Competency[]>();
  readonly borderColor = input.required<string>();
  readonly color = input.required<string>();

  readonly edit = output<Competency>();
  readonly delete = output<string>();
}
