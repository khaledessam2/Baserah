import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { SkillsGapService } from '@/services/skills-gap.service';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';
import { TABS_DIRECTIVES } from '@/shared/components/tabs';
import { SkillsGapOverviewTab } from '@/components/skills-gap/overview-tab/overview-tab';
import { SkillsGapHeatmapTab } from '@/components/skills-gap/heatmap-tab/heatmap-tab';
import { SkillsGapRoleTab } from '@/components/skills-gap/role-tab/role-tab';
import { SkillsGapDepartmentTab } from '@/components/skills-gap/department-tab/department-tab';
import { SkillsGapEmployeeTab } from '@/components/skills-gap/employee-tab/employee-tab';
import { SkillsGapCriticalRisksTab } from '@/components/skills-gap/critical-risks-tab/critical-risks-tab';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `pages/SkillsGapPage.tsx`. */
@Component({
  selector: 'app-skills-gap-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Icon,
    ...TABS_DIRECTIVES,
    SkillsGapOverviewTab,
    SkillsGapHeatmapTab,
    SkillsGapRoleTab,
    SkillsGapDepartmentTab,
    SkillsGapEmployeeTab,
    SkillsGapCriticalRisksTab,
    TranslatePipe,
  ],
  templateUrl: './skills-gap-page.html',
})
export class SkillsGapPage {
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly skillsGapService = inject(SkillsGapService);

  readonly isRtl = computed(() => this.i18n.language() === 'ar');
  readonly orgName = computed(() => this.auth.user()?.organization_name);

  readonly activeTab = signal('overview');
  readonly jobTitles = signal<string[]>([]);

  readonly tabs: { value: string; labelKey: string; icon: IconName }[] = [
    { value: 'overview', labelKey: 'skills_gap.tabs.overview', icon: 'BarChart3' },
    { value: 'heatmap', labelKey: 'skills_gap.tabs.heatmap', icon: 'Grid3X3' },
    { value: 'role', labelKey: 'skills_gap.tabs.role', icon: 'Briefcase' },
    {
      value: 'department',
      labelKey: 'skills_gap.tabs.department',
      icon: 'Building',
    },
    { value: 'employee', labelKey: 'skills_gap.tabs.employee', icon: 'User' },
    { value: 'risks', labelKey: 'skills_gap.tabs.risks', icon: 'ShieldAlert' },
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const orgName = this.orgName();
      this.skillsGapService
        .getFilters(orgName)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (r) => {
            if (r.data) this.jobTitles.set(r.data.job_titles || []);
          },
          error: () => {},
        });
    });
  }

}
