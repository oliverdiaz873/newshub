import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { buildMeta, normalizePagination } from '../../common/pagination';

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
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const STAFF_ROLES = ['admin', 'editor', 'reviewer'];

export interface FanOutInput {
  type: NotificationType;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  staffRoles?: string[];
  extraUserIds?: string[];
  payload?: Record<string, unknown> | null;
}

/**
 * In-app notifications (Increment 7). Delivery is poll-based: the dashboard
 * fetches the inbox + unread count on navigation and after actions. No
 * mail/push/sockets by design. Fan-out is role-directed (all staff except
 * the actor, honoring per-user muted types); there are no assignments yet
 * (Inc 8). Failures to fan out must never break the editorial action, so
 * all emitters call `emit` best-effort with a warning on drop.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NotificationsRepository) private readonly notifications: NotificationsRepository,
  ) {}

  /** Best-effort fan-out; resolves (never rejects) so emitters stay safe. */
  async emit(input: FanOutInput): Promise<void> {
    try {
      const staff = await this.notificationsListStaff(input.staffRoles ?? STAFF_ROLES);
      const ids = new Set<string>(staff);
      for (const extra of input.extraUserIds ?? []) ids.add(extra);
      if (input.actorId) ids.delete(input.actorId);
      if (ids.size === 0) return;
      const muted = await this.notifications.mutedTypesFor([...ids]);
      const targets = [...ids]
        .filter((id) => !(muted.get(id)?.has(input.type) ?? false))
        .map((userId) => ({
          userId,
          type: input.type,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          actorId: input.actorId ?? null,
          payload: input.payload ?? null,
        }));
      await this.notifications.createMany(targets);
    } catch (err) {
      this.logger.warn(`notification fan-out dropped (${input.type}): ${err instanceof Error ? err.message : err}`);
    }
  }

  private notificationsListStaff(roles: string[]) {
    return this.notifications.listStaffIds(roles).then((rows) => rows.map((row) => row.id));
  }

  async inbox(userId: string, page?: number, limit?: number) {
    const { page: p, limit: l } = normalizePagination(page, limit);
    const { total, unread, rows } = await this.notifications.list(userId, (p - 1) * l, l);
    return { data: rows, meta: { ...buildMeta(p, l, total), unread } };
  }

  unreadCount(userId: string) {
    return this.notifications.unreadCount(userId).then((unread) => ({ unread }));
  }

  async markRead(userId: string, id: string) {
    await this.notifications.markRead(userId, id);
    return { ok: true as const };
  }

  async markAllRead(userId: string) {
    const { count } = await this.notifications.markAllRead(userId);
    return { ok: true as const, updated: count };
  }

  prefs(userId: string) {
    return this.notifications.getPrefs(userId).then((row) => ({ mutedTypes: row?.mutedTypes ?? [] }));
  }

  setPrefs(userId: string, mutedTypes: string[]) {
    const clean = [...new Set(mutedTypes.filter((t) => (NOTIFICATION_TYPES as readonly string[]).includes(t)))].slice(0, 20);
    return this.notifications.setPrefs(userId, clean).then((row) => ({ mutedTypes: row.mutedTypes }));
  }
}
