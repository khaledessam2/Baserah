import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '@/services/theme.service';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { Icon } from '@/shared/components/icon/icon';

/** Port of `layout/ThemeToggle.tsx`. */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, Icon],
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle {
  private readonly themeService = inject(ThemeService);

  toggle(): void {
    this.themeService.setTheme(
      this.themeService.theme() === 'dark' ? 'light' : 'dark'
    );
  }
}
