'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ComponentType } from 'react';
import { useSidebarCollapsed } from '@/shared/lib/ui-prefs';
import {
  AnalyticsIcon,
  ArticleIcon,
  AuditLogIcon,
  AuthorIcon,
  CategoryIcon,
  MediaIcon,
  NotificationIcon,
  OpinionIcon,
  OverviewIcon,
  PlanningIcon,
  ScheduledIcon,
  SettingsIcon,
  SyndicationIcon,
} from './icons';

type SidebarIconComponent = ComponentType<{ className?: string }>;
type NavItem = { href: string; key: string; icon: SidebarIconComponent };

const EDITORIAL: NavItem[] = [
  { href: '/', key: 'overview', icon: OverviewIcon },
  { href: '/articles', key: 'articles', icon: ArticleIcon },
  { href: '/opinions', key: 'opinions', icon: OpinionIcon },
  { href: '/media', key: 'media', icon: MediaIcon },
  { href: '/categories', key: 'categories', icon: CategoryIcon },
  { href: '/authors', key: 'authors', icon: AuthorIcon },
];

const PLANNING: NavItem[] = [
  { href: '/planning', key: 'planning', icon: PlanningIcon },
  { href: '/scheduled', key: 'scheduled', icon: ScheduledIcon },
];

const ANALYSIS: NavItem[] = [
  { href: '/analytics', key: 'analytics', icon: AnalyticsIcon },
];

const SYSTEM: NavItem[] = [
  { href: '/notifications', key: 'notifications', icon: NotificationIcon },
  { href: '/syndication', key: 'syndication', icon: SyndicationIcon },
  { href: '/audit-log', key: 'auditLog', icon: AuditLogIcon },
  { href: '/settings', key: 'settings', icon: SettingsIcon },
];

/**
 * Shared navigation. The notifications badge count is injected by the app
 * layer (see app/dashboard-shell.tsx) so shared never imports features.
 */
export function Sidebar({
  onNavigate,
  unreadCount = 0,
  navCounts,
}: {
  onNavigate?: () => void;
  unreadCount?: number;
  navCounts?: { articles?: number; opinions?: number; categories?: number; authors?: number; media?: number };
}) {
  const t = useTranslations('nav');
  const tn = useTranslations('notifications');
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const unread = unreadCount;

  function countFor(key: string): number | undefined {
    if (!navCounts) return undefined;
    switch (key) {
      case 'articles':
        return navCounts.articles;
      case 'opinions':
        return navCounts.opinions;
      case 'categories':
        return navCounts.categories;
      case 'authors':
        return navCounts.authors;
      case 'media':
        return navCounts.media;
      default:
        return undefined;
    }
  }

  function navLink(item: NavItem) {
    const label = t(item.key);
    const Icon = item.icon;
    const showBadge = item.key === 'notifications' && unread > 0;
    const count = countFor(item.key);
    const showCount = typeof count === 'number' && !showBadge;
    return (
      <Link
        href={item.href}
        aria-current={pathname === item.href ? 'page' : undefined}
        className={pathname === item.href ? 'active' : undefined}
        onClick={onNavigate}
        data-nav={item.key}
        title={showBadge ? `${label} (${tn('unreadCount', { count: unread })})` : label}
      >
        <span aria-hidden="true" className="nh-side-short">
          <Icon />
          {showBadge && (
            <span className="nh-badge nh-badge-dot" aria-hidden="true">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </span>
        <span className="nh-side-full">
          <span className="nh-side-icon" aria-hidden="true"><Icon /></span>
          {label}
          {showBadge && (
            <span className="nh-badge" aria-label={tn('unreadCount', { count: unread })}>
              <span aria-hidden="true">{unread > 99 ? '99+' : unread}</span>
              <span className="nh-sr-only">{tn('unreadCount', { count: unread })}</span>
            </span>
          )}
          {showCount && (
            <span className="nh-count" aria-hidden="true">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <aside className={collapsed ? 'nh-sidebar collapsed' : 'nh-sidebar'} aria-label={t('primary')}>
      <div className="nh-sidebar-brand">
        <span className="nh-brand-mark" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-sidebar.png" alt="" width={40} height={40} />
        </span>
        <strong>Newshub</strong>
        <button
          className="nh-icon-btn side-toggle"
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('expand') : t('collapse')}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>
      <p className="nh-sidebar-group">{t('editorial')}</p>
      <ul>
        {EDITORIAL.map((item) => (
          <li key={item.href}>{navLink(item)}</li>
        ))}
      </ul>
      <p className="nh-sidebar-group">{t('planningGroup')}</p>
      <ul>
        {PLANNING.map((item) => (
          <li key={item.href}>{navLink(item)}</li>
        ))}
      </ul>
      <p className="nh-sidebar-group">{t('analysis')}</p>
      <ul>
        {ANALYSIS.map((item) => (
          <li key={item.href}>{navLink(item)}</li>
        ))}
      </ul>
      <p className="nh-sidebar-group">{t('system')}</p>
      <ul>
        {SYSTEM.map((item) => (
          <li key={item.href}>{navLink(item)}</li>
        ))}
      </ul>
      <p className="nh-sidebar-foot nh-muted">Editorial · {process.env.NODE_ENV}</p>
    </aside>
  );
}
