'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useTheme } from '@/shared/lib/theme';
import { useDashboardLocale } from '@/shared/lib/i18n';
import { useToast } from '@/shared/components/Toasts';

export function ThemeToggle() {
  const t = useTranslations('theme');
  const { preference, setPreference } = useTheme();
  const order = ['light', 'dark', 'system'] as const;
  const next = order[(order.indexOf(preference) + 1) % order.length];
  return (
    <button
      className="nh-icon-btn"
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`${t('label')}: ${t(preference)}`}
      title={`${t('label')}: ${t(preference)}`}
    >
      <span aria-hidden="true">{preference === 'light' ? '☀' : preference === 'dark' ? '☾' : '◐'}</span>
    </button>
  );
}

export function LocaleToggle() {
  const t = useTranslations('locale');
  const { locale, setLocale } = useDashboardLocale();
  return (
    <button
      className="nh-icon-btn"
      type="button"
      onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
      aria-label={`${t('label')}: ${t(locale)}`}
      title={t('label')}
    >
      {t(locale === 'es' ? 'en' : 'es')}
    </button>
  );
}

export function UserChip() {
  const { user, ready } = useAuth();
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
      <span>{user.displayName}</span>
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
          className="nh-btn"
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
