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
import { ButtonDirective } from '@/shared/directives/button.directive';
import { Icon } from '@/shared/components/icon/icon';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

import { performanceDimensions, measurementTypes, targetPeriods } from '../kpi-options/kpi-options';
import type { EditKpiPayload } from '@/models/kpi.model';

/** Port of `EditKpiModal`. */
@Component({
  selector: 'app-edit-kpi-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonDirective, Icon, TranslatePipe],
  templateUrl: './edit-kpi-modal.html',
})
export class EditKpiModal {
  readonly isOpen = input(false);
  readonly kpi = input<any | null>(null);

  readonly closed = output<void>();
  readonly saved = output<EditKpiPayload>();

  private readonly i18n = inject(I18nService);

  readonly dimension = signal('');
  readonly measurement = signal('');
  readonly period = signal('');

  readonly dimensions = computed(() => performanceDimensions(this.i18n));
  readonly measurements = computed(() => measurementTypes(this.i18n));
  readonly periods = computed(() => targetPeriods(this.i18n));

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  constructor() {
    effect(() => {
      const kpi = this.kpi();
      if (kpi) {
        this.dimension.set(kpi.performance_dimension || '');
        this.measurement.set(kpi.measurement_type || '');
        this.period.set(kpi.target_period || '');
      }
    });
  }

  handleSubmit(): void {
    this.saved.emit({
      performance_dimension: this.dimension(),
      measurement_type: this.measurement(),
      target_period: this.period(),
    });
  }
}
