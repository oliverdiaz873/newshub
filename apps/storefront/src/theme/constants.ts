import type { ResolvedTheme, ThemePreference } from './types';

export const THEME_STORAGE_KEY = 'newshub-theme';
export const THEME_ATTRIBUTE = 'data-theme';
export const THEME_PREFERENCE_ATTRIBUTE = 'data-theme-preference';
export const THEME_TRANSITION_ATTRIBUTE = 'data-theme-transition';

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';
export const DEFAULT_RESOLVED_THEME: ResolvedTheme = 'light';

export const THEME_COLOR_BY_RESOLVED_THEME: Record<ResolvedTheme, string> = {
  light: '#f5f1ea',
  dark: '#111827',
};


