'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useTheme, type ThemePreference } from '@/shared/lib/theme';
import { useDashboardLocale, type DashboardLocale } from '@/shared/lib/i18n';
import { useToast } from '@/shared/components/Toasts';
import { CheckIcon, ChevronDownIcon, MoonIcon, SearchIcon, SunIcon, SystemIcon, WorldIcon } from './icons';

/**
 * Dropdown open/close behavior (storefront parity: hover with 200ms close
 * delay + click toggle + outside mousedown + Escape). Visual reuse of the
 * storefront pattern; wired to the dashboard providers.
 *
 * Coordination: hook instances share a module-level registry of the
 * currently open dropdown. Opening one instantly closes any other open
 * one (no close animation) so Theme ↔ Language switches never overlap;
 * normal closes (outside, Escape, trigger) keep the 130ms animation.
 */
let openDropdownId: string | null = null;
const openDropdownListeners = new Set<(openId: string | null) => void>();

function useDropdownMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const menuId = useId();
  const id = useId();

  const open = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setInstant(false);
    setIsOpen(true);
    openDropdownId = id;
    openDropdownListeners.forEach((listener) => listener(id));
  };

  const close = () => {
    setInstant(false);
    setIsOpen(false);
    if (openDropdownId === id) openDropdownId = null;
  };

  const toggle = () => {
    if (isOpen) close();
    else open();
  };

  useEffect(() => {
    const onSwitch = (openId: string | null) => {
      if (openId !== null && openId !== id) {
        // Another dropdown opened: close immediately (no animation).
        setInstant(true);
        setIsOpen(false);
      }
    };
    openDropdownListeners.add(onSwitch);
    return () => {
      openDropdownListeners.delete(onSwitch);
      if (openDropdownId === id) openDropdownId = null;
    };
  }, [id]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
    // close/open are stable per render; re-subscribing is harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return {
    isOpen,
    instant,
    rootRef,
    menuId,
    open,
    close,
    toggle,
    scheduleClose: () => {
      hoverTimeoutRef.current = setTimeout(() => close(), 200);
    },
  };
}

const themeIcons = { light: SunIcon, dark: MoonIcon, system: SystemIcon } as const;

export function ThemeToggle() {
  const t = useTranslations('theme');
  const { preference, setPreference } = useTheme();
  const { isOpen, instant, rootRef, menuId, open, close, toggle, scheduleClose } = useDropdownMenu();
  const options: ThemePreference[] = ['light', 'dark', 'system'];
  const CurrentIcon = themeIcons[preference];

  return (
    <div ref={rootRef} className="nh-dropdown" onMouseEnter={open} onMouseLeave={scheduleClose}>
      <button
        type="button"
        className={`nh-dropdown-trigger${isOpen ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={`${t('label')}: ${t(preference)}`}
        title={`${t('label')}: ${t(preference)}`}
        onClick={toggle}
      >
        <CurrentIcon className="nh-dropdown-icon" />
        <span className="nh-dropdown-trigger-value">{t(preference)}</span>
        <span className="nh-dropdown-caret" aria-hidden="true">
          <ChevronDownIcon className={`nh-dropdown-chevron${isOpen ? ' is-open' : ''}`} />
        </span>
      </button>
      <div
        id={menuId}
        className={`nh-dropdown-menu${isOpen ? ' is-open' : ''}${instant ? ' is-instant' : ''}`}
        role="menu"
        aria-label={t('label')}
      >
        {options.map((opt) => {
          const OptionIcon = themeIcons[opt];
          const active = preference === opt;
          return (
            <button
              key={opt}
              type="button"
              className={`nh-dropdown-option${active ? ' is-active' : ''}`}
              role="menuitemradio"
              aria-checked={active}
              onClick={() => {
                setPreference(opt);
                close();
              }}
            >
              <OptionIcon className="nh-dropdown-icon" />
              <span>{t(opt)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const LOCALES: Array<{ code: DashboardLocale; nativeName: string }> = [
  { code: 'es', nativeName: 'Español' },
  { code: 'en', nativeName: 'English' },
];

export function LocaleToggle() {
  const t = useTranslations('locale');
  const { locale, setLocale } = useDashboardLocale();
  const { isOpen, instant, rootRef, menuId, open, close, toggle, scheduleClose } = useDropdownMenu();

  return (
    <div ref={rootRef} className="nh-dropdown" onMouseEnter={open} onMouseLeave={scheduleClose}>
      <button
        type="button"
        className={`nh-dropdown-trigger nh-dropdown-trigger-pill${isOpen ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={t('label')}
        title={t('label')}
        onClick={toggle}
      >
        <WorldIcon className="nh-dropdown-icon-sm" />
        <span className="nh-dropdown-code">{t(locale)}</span>
        <span className="nh-dropdown-caret" aria-hidden="true">
          <ChevronDownIcon className={`nh-dropdown-chevron-sm${isOpen ? ' is-open' : ''}`} />
        </span>
      </button>
      <div
        id={menuId}
        className={`nh-dropdown-menu nh-dropdown-menu-sm${isOpen ? ' is-open' : ''}${instant ? ' is-instant' : ''}`}
        role="menu"
        aria-label={t('label')}
      >
        {LOCALES.map((item) => {
          const active = locale === item.code;
          return (
            <button
              key={item.code}
              type="button"
              className={`nh-dropdown-option${active ? ' is-active' : ''}`}
              role="menuitemradio"
              aria-checked={active}
              onClick={() => {
                setLocale(item.code);
                close();
              }}
            >
              <span className="nh-dropdown-native">{item.nativeName}</span>
              {active && <CheckIcon className="nh-dropdown-check" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function UserChip() {
  const { user, ready } = useAuth();
  const tRole = useTranslations('roles');
  if (!ready) return <span className="nh-user-chip nh-muted">…</span>;
  if (!user) return null;
  const initials = user.displayName
    .split(/\s+/)
    .map((part) => part.slice(0, 1))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="nh-user-chip" title={`${user.displayName} · ${user.role}`}>
      <span className="nh-avatar" aria-hidden="true">
        {initials}
      </span>
      <span className="nh-user-details">
        <span className="nh-user-name">{user.displayName}</span>
        <span className="nh-user-role">{tRole(user.role)}</span>
      </span>
    </span>
  );
}

export function Topbar({
  onMenu,
  query,
  onQuery,
  menuRef,
  menuExpanded,
}: {
  onMenu: () => void;
  query: string;
  onQuery: (value: string) => void;
  menuRef?: React.RefObject<HTMLButtonElement | null>;
  menuExpanded?: boolean;
}) {
  const tTop = useTranslations('topbar');
  const { user, ready, logout } = useAuth();
  const { notify } = useToast();

  return (
    <header className="nh-topbar">
      <button
        ref={menuRef}
        className="nh-icon-btn"
        type="button"
        onClick={onMenu}
        aria-label={tTop('menu')}
        aria-expanded={menuExpanded}
      >
        ☰
      </button>
      <strong className="nh-brand">{tTop('brand')}</strong>
      <div className="nh-search">
        <SearchIcon className="nh-search-icon" />
        <input
          id="global-q"
          type="search"
          value={query}
          placeholder={tTop('searchPlaceholder')}
          aria-label={tTop('searchPlaceholder')}
          onChange={(event) => onQuery(event.target.value)}
        />
        {query && (
          <button className="nh-icon-btn" type="button" onClick={() => onQuery('')} aria-label={tTop('searchClear')}>
            ×
          </button>
        )}
      </div>
      <ThemeToggle />
      <LocaleToggle />
      <UserChip />
      {ready && !user && <Link href="/login">{tTop('signIn')}</Link>}
      {ready && user && (
        <button
          className="nh-btn nh-topbar-signout"
          type="button"
          onClick={() => {
            void logout().then(() => notify(tTop('signedOut')));
          }}
        >
          {tTop('signOut')}
        </button>
      )}
    </header>
  );
}
