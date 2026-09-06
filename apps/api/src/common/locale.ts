export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'es';

export interface ResolvedLocale {
  requested: SupportedLocale;
  resolved: SupportedLocale;
  fallback: boolean;
}

/**
 * Locale priority (API Contract v1.1): ?locale > Accept-Language > es.
 * Resolution against available locales never invents content here;
 * callers apply ES fallback and set the fallback flag.
 */
export function resolveLocale(queryLocale?: string, acceptLanguage?: string): ResolvedLocale {
  const normalized = queryLocale?.toLowerCase();
  if (normalized === 'es' || normalized === 'en') {
    return { requested: normalized, resolved: normalized, fallback: false };
  }
  const header = acceptLanguage?.toLowerCase() ?? '';
  const fromHeader: SupportedLocale = /\ben\b/.test(header) ? 'en' : 'es';
  return { requested: fromHeader, resolved: fromHeader, fallback: false };
}

export function isSupportedLocale(value: string): value is SupportedLocale {
  return value === 'es' || value === 'en';
}
