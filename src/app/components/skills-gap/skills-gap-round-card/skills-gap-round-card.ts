import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
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

  readonly isTech = computed(() => this.type() === 'tech');

  readonly shadowTint = computed(() =>
    this.isTech() ? 'shadow-indigo-500/10' : 'shadow-amber-500/10'
  );

  readonly iconGradient = computed(() =>
    this.isTech() ? 'from-indigo-500 to-blue-600' : 'from-amber-500 to-orange-600'
  );

  readonly scoreClass = computed(() => {
    const score = this.round().overall_score;
    if (score >= 60) return 'text-emerald-500';
    return score >= 40 ? 'text-amber-500' : 'text-red-500';
  });
}
