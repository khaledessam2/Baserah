import { Injectable, effect, signal } from '@angular/core';
import type { Theme } from '@/models/theme.model';

const STORAGE_KEY = 'baserah-theme';
const DEFAULT_THEME: Theme = 'system';

/** Port of `contexts/ThemeContext.tsx`. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly current = signal<Theme>(this.read());

  readonly theme = this.current.asReadonly();

  constructor() {
    effect(() => this.apply(this.current()));

    // Keep 'system' live rather than only resolving it once at startup.
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.current() === 'system') this.apply('system');
      });
  }

  setTheme(theme: Theme): void {
    localStorage.setItem(STORAGE_KEY, theme);
    this.current.set(theme);
  }

  private read(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored;
    }
    return DEFAULT_THEME;
  }

  private apply(theme: Theme): void {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }
}
