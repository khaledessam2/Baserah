import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@/services/i18n.service';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { Icon } from '@/shared/components/icon/icon';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

import { performanceDimensions, measurementTypes, targetPeriods } from '../kpi-options/kpi-options';
import type { AddKpiPayload } from '@/models/kpi.model';

/** Port of `AddKpiModal`. */
@Component({
  selector: 'app-add-kpi-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonDirective, Icon, TranslatePipe],
  templateUrl: './add-kpi-modal.html',
})
export class AddKpiModal {
  readonly isOpen = input(false);
  readonly competencies = input<{ competency_name: string; competency_type: string }[]>(
    []
  );

  readonly closed = output<void>();
  readonly added = output<AddKpiPayload>();

  private readonly i18n = inject(I18nService);

  readonly kpiText = signal('');
  readonly dimension = signal('');
  readonly measurement = signal('');
  readonly period = signal('');
  readonly selectedCompetency = signal('');

  readonly dimensions = computed(() => performanceDimensions(this.i18n));
  readonly measurements = computed(() => measurementTypes(this.i18n));
  readonly periods = computed(() => targetPeriods(this.i18n));

  readonly saveIconClass = computed(() =>
    cn('w-4 h-4', this.i18n.language() === 'ar' ? 'ml-2' : 'mr-2')
  );

  handleSubmit(): void {
    if (!this.kpiText().trim()) return;
    const comp = this.competencies().find(
      (c) => c.competency_name === this.selectedCompetency()
    );
    this.added.emit({
      kpi_text: this.kpiText(),
      performance_dimension: this.dimension(),
      measurement_type: this.measurement(),
      target_period: this.period(),
      competency: this.selectedCompetency() || 'job_description',
      competency_type: comp?.competency_type || 'core_competency',
    });
    this.kpiText.set('');
    this.dimension.set('');
    this.measurement.set('');
    this.period.set('');
    this.selectedCompetency.set('');
  }
}
