/**
 * next-intl routing configuration.
 *
 * Defines supported locales and default locale for the application.
 * Exports locale-aware wrappers around Next.js navigation APIs
 * (Link, redirect, usePathname, useRouter, getPathname) that
 * automatically prefix paths with the active locale.
 *
 * Used by request.ts for locale validation and by all components
 * that require locale-aware navigation.
 */
import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 31536000
  }
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
