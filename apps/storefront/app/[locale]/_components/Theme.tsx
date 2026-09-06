'use client';

import { useEffect } from 'react';

const storageKey = 'newshub-theme';
const themeAttr = 'data-theme';
const prefAttr = 'data-theme-preference';
const defaultTheme = 'system';
const defaultResolved = 'light';

function isTheme(value: string): value is 'light' | 'dark' | 'system' {
  return value === 'light' || value === 'dark' || value === 'system';
}

function getStoredTheme(): 'light' | 'dark' | 'system' | null {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored && isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): 'light' | 'dark' {
  const media = typeof window.matchMedia === 'function' 
    ? window.matchMedia('(prefers-color-scheme: dark)') 
    : null;
  return media && media.matches ? 'dark' : defaultResolved;
}

function resolveTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const resolvedTheme = resolveTheme(theme);
  const root = document.documentElement;
  
  root.setAttribute(themeAttr, resolvedTheme);
  root.setAttribute(prefAttr, theme);
  root.style.colorScheme = resolvedTheme;
  
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', resolvedTheme === 'dark' ? '#111827' : '#f5f1ea');
  }
}

export function Theme() {
  useEffect(() => {
    // Apply theme immediately on mount
    const theme = getStoredTheme() || defaultTheme;
    applyTheme(theme);

    // Listen for system theme changes
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const storedTheme = getStoredTheme();
      if (storedTheme === 'system') {
        applyTheme('system');
      }
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return null;
}
