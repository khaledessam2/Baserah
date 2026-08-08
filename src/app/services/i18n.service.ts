import { Injectable, computed, signal } from '@angular/core';
import ar from '../../locales/ar.json';
import en from '../../locales/en.json';
import type { Language } from '@/models/i18n.model';

const STORAGE_KEY = 'i18nextLng';
const FALLBACK: Language = 'ar';

type Bundle = Record<string, unknown>;

const RESOURCES: Record<Language, Bundle> = {
  ar: ar as Bundle,
  en: en as Bundle,
};

/**
 * Port of `src/i18n.ts`.
 *
 * The React app used i18next, but the bundles only ever needed dotted key
 * lookup and `{{name}}` interpolation — no plurals, no contexts — so this is a
 * direct signal-based replacement. It keeps i18next's `i18nextLng` storage key
 * so an existing user's language choice carries over.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly current = signal<Language>(this.detect());

  /** Reactive current language — read it to make a computed re-run on change. */
  readonly language = this.current.asReadonly();
  readonly dir = computed<'rtl' | 'ltr'>(() =>
    this.current() === 'ar' ? 'rtl' : 'ltr'
  );

  constructor() {
    this.applyToDocument(this.current());
  }

  changeLanguage(lng: Language): void {
    if (lng !== 'ar' && lng !== 'en') return;
    localStorage.setItem(STORAGE_KEY, lng);
    this.current.set(lng);
    this.applyToDocument(lng);
  }

  /**
   * `t('a.b.c')` / `t('a.b', { name: 'x' })` / `t('a.b', 'fallback text')`
   *
   * The string second argument is i18next's `defaultValue` shorthand, which the
   * React components used in a few dozen places.
   */
  t(
    key: string,
    paramsOrDefault?: Record<string, string | number> | string
  ): string {
    const lng = this.current();
    const value =
      this.lookup(RESOURCES[lng], key) ?? this.lookup(RESOURCES[FALLBACK], key);

    const fallback =
      typeof paramsOrDefault === 'string' ? paramsOrDefault : key;
    const params =
      typeof paramsOrDefault === 'object' ? paramsOrDefault : undefined;

    if (typeof value !== 'string') {
      return fallback;
    }
    return params ? this.interpolate(value, params) : value;
  }

  /** Non-string nodes (arrays/objects used as lists in the bundles). */
  tRaw<T = unknown>(key: string): T | undefined {
    const lng = this.current();
    return (this.lookup(RESOURCES[lng], key) ??
      this.lookup(RESOURCES[FALLBACK], key)) as T | undefined;
  }

  private lookup(bundle: Bundle, key: string): unknown {
    let node: unknown = bundle;
    for (const part of key.split('.')) {
      if (node === null || typeof node !== 'object') return undefined;
      node = (node as Record<string, unknown>)[part];
    }
    return node;
  }

  private interpolate(
    template: string,
    params: Record<string, string | number>
  ): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match
    );
  }

  private detect(): Language {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
    const browser = navigator.language?.split('-')[0];
    return browser === 'en' ? 'en' : FALLBACK;
  }

  private applyToDocument(lng: Language): void {
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  }
}
