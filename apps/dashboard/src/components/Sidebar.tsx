'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSidebarCollapsed } from '@/lib/ui-prefs';
import { useUnreadCount } from '@/lib/notifications';

const MANAGE: Array<{ href: string; key: string }> = [
  { href: '/', key: 'overview' },
  { href: '/articles', key: 'articles' },
  { href: '/opinions', key: 'opinions' },
  { href: '/scheduled', key: 'scheduled' },
  { href: '/planning', key: 'planning' },
  { href: '/analytics', key: 'analytics' },
  { href: '/media', key: 'media' },
  { href: '/categories', key: 'categories' },
  { href: '/authors', key: 'authors' },
];

const SYSTEM: Array<{ href: string; key: string }> = [
  { href: '/notifications', key: 'notifications' },
  { href: '/syndication', key: 'syndication' },
  { href: '/audit-log', key: 'auditLog' },
  { href: '/settings', key: 'settings' },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('nav');
  const tn = useTranslations('notifications');
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const { unread } = useUnreadCount();

  function navLink(item: { href: string; key: string }) {
    const label = t(item.key);
    const showBadge = item.key === 'notifications' && unread > 0;
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
          {label.slice(0, 1).toUpperCase()}
          {showBadge && (
            <span className="nh-badge nh-badge-dot" aria-hidden="true">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </span>
        <span className="nh-side-full">
          {label}
          {showBadge && (
            <span className="nh-badge" aria-label={tn('unreadCount', { count: unread })}>
              <span aria-hidden="true">{unread > 99 ? '99+' : unread}</span>
              <span className="nh-sr-only">{tn('unreadCount', { count: unread })}</span>
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <aside className={collapsed ? 'nh-sidebar collapsed' : 'nh-sidebar'} aria-label={t('primary')}>
      <div className="nh-sidebar-brand">
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
      <p className="nh-sidebar-group">{t('manage')}</p>
      <ul>
        {MANAGE.map((item) => (
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
