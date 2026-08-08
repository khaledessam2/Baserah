import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GuidedTour } from '@/shared/components/guided-tour/guided-tour';
import { Toaster } from '@/shared/components/toaster/toaster';
import { I18nService } from '@/services/i18n.service';
import { ThemeService } from '@/services/theme.service';

/**
 * Root shell — the Angular equivalent of App.tsx's provider stack plus the
 * `ToastProvider` that wrapped it in main.tsx.
 *
 * Theme and i18n are root-provided services rather than context providers; both
 * are injected here so they initialise (and apply their html attributes) before
 * the first route renders.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Toaster, GuidedTour],
  templateUrl: './app.html',
})
export class App {
  // Instantiated for their startup side effects (html lang/dir, .dark class).
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
}
