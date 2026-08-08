import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { cn } from '@/shared/utils/utils';

/** Port of the score bar in `skills-gap/GapBadge.tsx`. */
@Component({
  selector: 'app-score-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './score-bar.html',
})
export class ScoreBar {
  readonly score = input.required<number>();
  readonly height = input('h-2');

  readonly width = computed(() => Math.min(this.score(), 100));

  private readonly color = computed(() => {
    const score = this.score();
    return score >= 80
      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
      : score >= 60
      ? 'bg-gradient-to-r from-blue-500 to-indigo-400'
      : score >= 40
      ? 'bg-gradient-to-r from-amber-500 to-orange-400'
      : 'bg-gradient-to-r from-red-500 to-rose-400';
  });

  readonly trackClasses = computed(() =>
    cn(
      'w-full rounded-full bg-slate-200/60 dark:bg-slate-700/50 overflow-hidden',
      this.height()
    )
  );

  readonly fillClasses = computed(() =>
    cn('rounded-full transition-all duration-700 ease-out', this.height(), this.color())
  );
}
