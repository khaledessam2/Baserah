import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '@/services/i18n.service';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { Icon } from '@/shared/components/icon/icon';

/** Port of `layout/LanguageSelector.tsx`. */
@Component({
  selector: 'app-language-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, Icon],
  templateUrl: './language-selector.html',
})
export class LanguageSelector {
  readonly i18n = inject(I18nService);

  readonly classes = computed(() =>
    cn(
      'flex items-center gap-2 px-3 h-10 rounded-full border border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md hover:bg-white/60 dark:hover:bg-slate-800 transition-all shadow-sm',
      this.i18n.language() === 'ar' ? 'flex-row-reverse font-sans' : 'font-sans'
    )
  );

  toggleLanguage(): void {
    this.i18n.changeLanguage(this.i18n.language() === 'ar' ? 'en' : 'ar');
  }
}
