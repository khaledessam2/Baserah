import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { cn } from '@/shared/utils/utils';

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
