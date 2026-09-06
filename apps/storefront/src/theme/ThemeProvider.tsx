'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_ATTRIBUTE,
  THEME_COLOR_BY_RESOLVED_THEME,
  THEME_PREFERENCE_ATTRIBUTE,
  THEME_STORAGE_KEY,
  THEME_TRANSITION_ATTRIBUTE,
} from './constants';
import { readThemePreference, writeThemePreference, isThemePreference } from './storage';
import { getSystemTheme, resolveTheme, subscribeToSystemTheme } from './system';
import type { ResolvedTheme, StoredThemeState, ThemeContextValue, ThemePreference } from './types';

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const getDocumentThemePreference = (): StoredThemeState => {
  if (typeof document === 'undefined') {
    return readThemePreference();
  }

  const themePreference = document.documentElement.getAttribute(THEME_PREFERENCE_ATTRIBUTE);

  if (isThemePreference(themePreference)) {
    let storedTheme: string | null = null;

    try {
      storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      storedTheme = null;
    }

    return {
      theme: themePreference,
      isUserPreference: themePreference !== DEFAULT_THEME_PREFERENCE || storedTheme === DEFAULT_THEME_PREFERENCE,
    };
  }

  return readThemePreference();
};

const getDocumentResolvedTheme = (): ResolvedTheme | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const theme = document.documentElement.getAttribute(THEME_ATTRIBUTE);
  return theme === 'light' || theme === 'dark' ? theme : null;
};

const applyThemeToDocument = (theme: ThemePreference, resolvedTheme: ResolvedTheme) => {
  const root = document.documentElement;
  root.setAttribute(THEME_ATTRIBUTE, resolvedTheme);
  root.setAttribute(THEME_PREFERENCE_ATTRIBUTE, theme);
  root.style.colorScheme = resolvedTheme;

  const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.content = THEME_COLOR_BY_RESOLVED_THEME[resolvedTheme];
  }
};

const beginThemeTransition = () => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  if (reduceMotion) {
    return () => undefined;
  }

  root.setAttribute(THEME_TRANSITION_ATTRIBUTE, 'true');
  const timeoutId = window.setTimeout(() => {
    root.removeAttribute(THEME_TRANSITION_ATTRIBUTE);
  }, 250);

  return () => {
    window.clearTimeout(timeoutId);
    root.removeAttribute(THEME_TRANSITION_ATTRIBUTE);
  };
};

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const initialPreference = getDocumentThemePreference();
  const [themeState, setThemeState] = useState<StoredThemeState>(initialPreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(
    () => getDocumentResolvedTheme() ?? getSystemTheme(),
  );
  const hasMountedRef = useRef(false);
  const resolvedTheme = resolveTheme(themeState.theme, systemTheme);
  const resolvedThemeRef = useRef(resolvedTheme);

  useEffect(() => {
    resolvedThemeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    return subscribeToSystemTheme(setSystemTheme);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      setThemeState(
        isThemePreference(event.newValue)
          ? { theme: event.newValue, isUserPreference: true }
          : { theme: DEFAULT_THEME_PREFERENCE, isUserPreference: false },
      );
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    writeThemePreference(themeState.theme, themeState.isUserPreference);
  }, [themeState]);

  useEffect(() => {
    let endTransition: () => void = () => {};

    if (hasMountedRef.current) {
      endTransition = beginThemeTransition();
    }

    applyThemeToDocument(themeState.theme, resolvedTheme);
    hasMountedRef.current = true;

    return endTransition;
  }, [resolvedTheme, themeState.theme]);

  const setTheme = useCallback((theme: ThemePreference) => {
    setThemeState({ theme, isUserPreference: true });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentState) => {
      const currentResolvedTheme = currentState.theme === 'system'
        ? resolvedThemeRef.current
        : currentState.theme;

      return {
        theme: currentResolvedTheme === 'dark' ? 'light' : 'dark',
        isUserPreference: true,
      };
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themeState.theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [resolvedTheme, setTheme, themeState.theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
