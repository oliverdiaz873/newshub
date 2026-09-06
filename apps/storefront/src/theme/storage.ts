import { DEFAULT_THEME_PREFERENCE, THEME_STORAGE_KEY } from './constants';
import type { StoredThemeState, ThemePreference } from './types';

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

export const readThemePreference = (): StoredThemeState => {
  if (typeof window === 'undefined') {
    return { theme: DEFAULT_THEME_PREFERENCE, isUserPreference: false };
  }

  try {
    const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (isThemePreference(storedValue)) {
      return { theme: storedValue, isUserPreference: true };
    }
  } catch {
    // Ignore storage read failures and fall back to the default preference.
  }

  return { theme: DEFAULT_THEME_PREFERENCE, isUserPreference: false };
};

export const writeThemePreference = (theme: ThemePreference, isUserPreference: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!isUserPreference) {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage write failures to keep theming functional.
  }
};
