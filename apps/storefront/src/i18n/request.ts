/**
 * next-intl request configuration.
 *
 * Entry point for next-intl, referenced in next.config.ts via
 * createNextIntlPlugin. Responsibilities:
 * - Receive the detected locale (URL, cookie, header).
 * - Validate it against routing.locales; fall back to defaultLocale if unsupported.
 * - Load messages/{locale}.json as the translation source.
 *
 * Translations are injected into the React tree via NextIntlClientProvider
 * in app/[locale]/layout.tsx, and consumed through useTranslations() or
 * getTranslations() in client and server components respectively.
 */
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming locale is supported
  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
