'use client';

import { useCallback, useEffect, useState } from 'react';

export type Density = 'comfortable' | 'compact';
export type PreviewLanguage = 'es-first' | 'en-first';

const SIDEBAR_KEY = 'newshub-sidebar';
const DENSITY_KEY = 'newshub-density';
const PREVIEW_LANG_KEY = 'newshub-preview-lang';

function readStored(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function useSidebarCollapsed(): [boolean, (collapsed: boolean) => void] {
  const [collapsed, setCollapsed] = useState(() => readStored(SIDEBAR_KEY) === 'collapsed');
  const set = useCallback((next: boolean) => {
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? 'collapsed' : 'expanded');
    } catch {
      // ignore
    }
    setCollapsed(next);
  }, []);
  return [collapsed, set];
}

export function useUiPrefs(): {
  density: Density;
  previewLang: PreviewLanguage;
  save: (density: Density, previewLang: PreviewLanguage) => void;
} {
  const [density, setDensity] = useState<Density>(() =>
    readStored(DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable',
  );
  const [previewLang, setPreviewLang] = useState<PreviewLanguage>(() =>
    readStored(PREVIEW_LANG_KEY) === 'en-first' ? 'en-first' : 'es-first',
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  const save = useCallback((nextDensity: Density, nextPreview: PreviewLanguage) => {
    try {
      localStorage.setItem(DENSITY_KEY, nextDensity);
      localStorage.setItem(PREVIEW_LANG_KEY, nextPreview);
    } catch {
      // ignore
    }
    setDensity(nextDensity);
    setPreviewLang(nextPreview);
    document.documentElement.setAttribute('data-density', nextDensity);
  }, []);

  return { density, previewLang, save };
}
