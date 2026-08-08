import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { I18nService } from '@/services/i18n.service';
import { cn } from '@/shared/utils/utils';

const SEVERITY_STYLES: Record<string, string> = {
  critical:
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50',
  medium:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  strength:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
};

/** Port of `skills-gap/GapBadge.tsx`. */
@Component({
  selector: 'app-gap-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gap-badge.html',
})
export class GapBadge {
  readonly severity = input.required<string>();
  private readonly i18n = inject(I18nService);

  readonly label = computed(() =>
    this.i18n.t(`skills_gap.severity.${this.severity()}`, this.severity())
  );

  readonly classes = computed(() =>
    cn(
      'px-2.5 py-0.5 rounded-lg text-[10px] font-black border tracking-wide',
      SEVERITY_STYLES[this.severity()] || SEVERITY_STYLES['low']
    )
  );
}
