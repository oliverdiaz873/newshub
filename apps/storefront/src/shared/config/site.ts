import { routing } from '@/i18n/routing'

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://pre-advanced-websites-news-next.vercel.app'

export const SITE_NAME = 'NewsHub'

export function getLocalePrefix(locale: string): string {
  return locale === routing.defaultLocale ? '' : `/${locale}`
}

export function getOgLocale(locale: string): string {
  const map: Record<string, string> = {
    es: 'es_DO',
    en: 'en_US',
  }
  return map[locale] ?? 'es_DO'
}
