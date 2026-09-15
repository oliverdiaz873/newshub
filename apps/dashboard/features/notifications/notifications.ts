'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/shared/api/auth';

export interface NotificationItem {
  id: string;
  type: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  actor?: { id: string; email: string; displayName: string } | null;
}

export const NOTIFICATION_TYPES = [
  'review.requested',
  'published',
  'rejected',
  'unpublished',
  'archived',
  'schedule.executed',
  'schedule.failed',
  'assigned',
  'due.soon',
  'overdue',
  'planning.transition',
] as const;

/** next-intl namespace keys cannot contain dots; notification types do. */
export function typeLabelKey(type: string): string {
  return `type_${type.replace(/\./g, '_')}`;
}

export function notificationHref(n: NotificationItem): string | null {
  if (!n.entityId) return null;
  if (n.entityType === 'article') return `/articles/${n.entityId}`;
  if (n.entityType === 'opinion') return `/opinions/${n.entityId}`;
  return null;
}

export function useUnreadCount(pollMs = 30000): { unread: number; refresh: () => void } {
  const { apiFetch, user, ready } = useAuth();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    if (!ready || !user) return;
    void (async () => {
      try {
        const res = await apiFetch('/notifications/unread-count');
        if (!res.ok) return;
        const body = (await res.json()) as { unread?: number };
        if (typeof body.unread === 'number') setUnread(body.unread);
      } catch {
        // Badge is best-effort; inbox remains authoritative.
      }
    })();
  }, [apiFetch, ready, user]);

  useEffect(() => {
    refresh();
    if (pollMs <= 0) return;
    const timer = setInterval(refresh, pollMs);
    return () => clearInterval(timer);
  }, [refresh, pollMs]);

  return { unread, refresh };
}
