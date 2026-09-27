'use client';

import { Shell } from '@/shared/components/Shell';
import { useUnreadCount } from '@/features/notifications/notifications';
import { useNavCounts } from './nav-counts';

/**
 * App-layer shell wiring (composition root). Lives in app/ precisely so
 * shared/ never imports features/: the unread badge is notification-domain
 * state, injected here as a plain prop into the shared Shell/Sidebar.
 * Nav counts are Tier-1 totals (best-effort) for mockup-parity badges.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { unread } = useUnreadCount();
  const navCounts = useNavCounts();
  return (
    <Shell sidebarUnreadCount={unread} sidebarNavCounts={navCounts}>
      {children}
    </Shell>
  );
}
