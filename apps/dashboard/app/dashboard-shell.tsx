'use client';

import { Shell } from '@/shared/components/Shell';
import { useUnreadCount } from '@/features/notifications/notifications';

/**
 * App-layer shell wiring (composition root). Lives in app/ precisely so
 * shared/ never imports features/: the unread badge is notification-domain
 * state, injected here as a plain prop into the shared Shell/Sidebar.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { unread } = useUnreadCount();
  return <Shell sidebarUnreadCount={unread}>{children}</Shell>;
}
