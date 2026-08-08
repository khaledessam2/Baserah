import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { cn } from '@/shared/utils/utils';
import { Icon } from '@/shared/components/icon/icon';
import { GapBadge } from '../gap-badge/gap-badge';
import { ScoreBar } from '../score-bar/score-bar';
import { formatDate } from '@/shared/utils/format-date';
import type { Round } from '@/models/skills-gap.model';

/** Port of the `RoundCard` helper in `skills-gap/EmployeeTab.tsx`. */
@Component({
  selector: 'app-skills-gap-round-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, GapBadge, ScoreBar],
  templateUrl: './skills-gap-round-card.html',
})
export class SkillsGapRoundCard {
  readonly round = input.required<Round>();
  readonly type = input.required<'tech' | 'manager'>();
  readonly correctLabel = input.required<string>();
  readonly locale = input.required<string>();

  readonly expanded = signal(false);

  readonly formattedDate = computed(() =>
    formatDate(this.round().date, this.locale())
  );

  readonly wrapperClass = computed(() =>
    cn(
      'rounded-2xl border border-white/10 dark:border-white/5 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden transition-all duration-300',
      this.type() === 'tech' ? 'shadow-indigo-500/10' : 'shadow-amber-500/10',
      this.expanded() && 'shadow-xl'
    )
  );

  readonly iconWrapClass = computed(() =>
    cn(
      'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shrink-0 shadow-lg',
      this.type() === 'tech'
        ? 'from-indigo-500 to-blue-600'
        : 'from-amber-500 to-orange-600'
    )
  );

  readonly scoreClass = computed(() => {
    const score = this.round().overall_score;
    return cn(
      'text-2xl font-black',
      score >= 60
        ? 'text-emerald-500'
        : score >= 40
        ? 'text-amber-500'
        : 'text-red-500'
    );
  });
}
