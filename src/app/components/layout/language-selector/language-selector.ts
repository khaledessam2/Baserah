import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '@/services/i18n.service';
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

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  toggleLanguage(): void {
    this.i18n.changeLanguage(this.i18n.language() === 'ar' ? 'en' : 'ar');
  }
}
