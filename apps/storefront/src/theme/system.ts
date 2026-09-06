import { DEFAULT_RESOLVED_THEME } from './constants';
import type { ResolvedTheme, ThemePreference } from './types';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

export const getThemeMediaQuery = (): MediaQueryList | null => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  return window.matchMedia(MEDIA_QUERY);
};

export const getSystemTheme = (): ResolvedTheme => {
  const mediaQuery = getThemeMediaQuery();
  return mediaQuery?.matches ? 'dark' : DEFAULT_RESOLVED_THEME;
};

export const resolveTheme = (
  theme: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme => (theme === 'system' ? systemTheme : theme);

export const subscribeToSystemTheme = (
  listener: (nextTheme: ResolvedTheme) => void,
): (() => void) => {
  const mediaQuery = getThemeMediaQuery();

  if (!mediaQuery) {
    return () => undefined;
  }

  const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
    listener(event.matches ? 'dark' : 'light');
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }

  mediaQuery.addListener(handleChange);
  return () => mediaQuery.removeListener(handleChange);
};
