import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { I18nService } from '@/services/i18n.service';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `KpiCategorySection`. */
@Component({
  selector: 'app-kpi-category-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TranslatePipe],
  templateUrl: './kpi-category-section.html',
})
export class KpiCategorySection {
  readonly title = input.required<string>();
  readonly icon = input.required<IconName>();
  readonly color = input.required<string>();
  readonly kpis = input.required<any[]>();

  readonly edit = output<any>();
  readonly delete = output<any>();

  private readonly i18n = inject(I18nService);
  readonly isRtl = computed(() => this.i18n.language() === 'ar');

}
