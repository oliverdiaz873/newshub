'use client';

import { useEffect, useId, useRef, useState, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { SunIcon, MoonIcon, SystemIcon, ChevronDownIcon } from '../icons';
import { useTheme, type ThemePreference } from '../../../theme';

const iconByTheme: Record<ThemePreference, ReactElement> = {
  light: <SunIcon className="h-[1.25rem] w-[1.25rem] shrink-0" />,
  dark: <MoonIcon className="h-[1.25rem] w-[1.25rem] shrink-0" />,
  system: <SystemIcon className="h-[1.25rem] w-[1.25rem] shrink-0" />,
};

const options: Array<{ value: ThemePreference; labelKey: string }> = [
  { value: 'light', labelKey: 'theme.options.light' },
  { value: 'dark', labelKey: 'theme.options.dark' },
  { value: 'system', labelKey: 'theme.options.system' },
];

export const ThemeToggle = () => {
  const t = useTranslations('common');
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const menuId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const selectedOption = options.find((option) => option.value === theme) ?? options[2];
  const selectedLabel = t(selectedOption.labelKey);
  const resolvedThemeLabel = t(`theme.options.${resolvedTheme}`);

  const handleSelect = (nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    setIsOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className="theme-toggle"
      aria-label={t('theme.selectorLabel', { preference: selectedLabel, applied: resolvedThemeLabel })}
      onMouseEnter={() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsOpen(true);
      }}
      onMouseLeave={() => {
        hoverTimeoutRef.current = setTimeout(() => setIsOpen(false), 200);
      }}
    >
      <button
        type="button"
        className={`theme-toggle-trigger ${isOpen ? 'is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={t('theme.triggerLabel', { preference: selectedLabel, applied: resolvedThemeLabel })}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        {iconByTheme[theme]}
        <span className="theme-toggle-trigger-value">{selectedLabel}</span>
        <span className="theme-toggle-caret" aria-hidden="true">
          <ChevronDownIcon className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      <div
        id={menuId}
        className={`theme-toggle-menu ${isOpen ? 'is-open' : ''}`}
        role="menu"
        aria-label={t('theme.menuLabel')}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`theme-toggle-option ${theme === option.value ? 'is-active' : ''}`}
            onClick={() => handleSelect(option.value)}
            role="menuitemradio"
            aria-checked={theme === option.value}
            aria-label={t(
              option.value === 'system' ? 'theme.useSystemLabel' : 'theme.useThemeLabel',
              { theme: t(option.labelKey), applied: resolvedThemeLabel },
            )}
          >
            {iconByTheme[option.value]}
            <span className="theme-toggle-label">{t(option.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
