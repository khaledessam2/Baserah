/** Locale-aware short date used across the skills-gap views. */
export function formatDate(d: string, locale: string): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return d;
  }
}
