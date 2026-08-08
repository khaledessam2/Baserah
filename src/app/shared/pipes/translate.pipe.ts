import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '@/services/i18n.service';

/**
 * `{{ 'nav.dashboard' | t }}` / `{{ 'x.y' | t: { name: 'z' } }}`
 *
 * Impure on purpose: it reads the language signal on every run, which both
 * registers the host view as a consumer (so switching language re-renders it)
 * and keeps results correct. Lookups are memoised per language+key+params so
 * the repeated change-detection passes stay cheap.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);
  private readonly cache = new Map<string, string>();

  transform(
    key: string,
    paramsOrDefault?: Record<string, string | number> | string
  ): string {
    // Read the signal first and unconditionally — this is the dependency that
    // makes language switching propagate. Never move it below the cache hit.
    const lang = this.i18n.language();
    if (!key) return '';

    const cacheKey =
      paramsOrDefault === undefined
        ? `${lang}|${key}`
        : `${lang}|${key}|${JSON.stringify(paramsOrDefault)}`;

    const hit = this.cache.get(cacheKey);
    if (hit !== undefined) return hit;

    const value = this.i18n.t(key, paramsOrDefault);
    this.cache.set(cacheKey, value);
    return value;
  }
}
