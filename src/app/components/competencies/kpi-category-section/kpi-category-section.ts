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
  private readonly isRtl = computed(() => this.i18n.language() === 'ar');

  readonly headerClass = computed(() =>
    cn(
      'flex items-center gap-2 mb-3 border-b pb-2',
      this.isRtl() && 'flex-row-reverse'
    )
  );

  readonly rowClass = computed(() =>
    cn(
      'flex justify-between items-start gap-3',
      this.isRtl() && 'flex-row-reverse'
    )
  );

  readonly kpiTextClass = computed(() =>
    cn('font-medium text-foreground mb-2', this.isRtl() && 'text-right')
  );

  readonly tagRowClass = computed(() =>
    cn(
      'flex flex-wrap gap-2 text-xs',
      this.isRtl() && 'flex-row-reverse justify-end'
    )
  );

  readonly actionsClass = computed(() =>
    cn(
      'flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
      this.isRtl() && 'flex-row-reverse'
    )
  );
}
