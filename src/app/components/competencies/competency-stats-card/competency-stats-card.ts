import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

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

}
