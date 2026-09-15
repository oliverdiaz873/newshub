import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface NotificationCreate {
  userId: string;
  type: string;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  payload?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Staff ids for fan-out (safe projection: id only). */
  listStaffIds(roles: string[]) {
    return this.prisma.user.findMany({
      where: { role: { in: roles } },
      select: { id: true },
    });
  }

  createMany(inputs: NotificationCreate[]) {
    if (inputs.length === 0) return { count: 0 };
    return this.prisma.notification.createMany({
      data: inputs.map((input) => ({
        userId: input.userId,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        actorId: input.actorId ?? null,
        payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      })),
    });
  }

  async list(userId: string, skip: number, take: number) {
    const [total, unread, rows] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { actor: { select: { id: true, email: true, displayName: true } } },
      }),
    ]);
    return { total, unread, rows };
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  getPrefs(userId: string) {
    return this.prisma.notificationPref.findUnique({ where: { userId } });
  }

  setPrefs(userId: string, mutedTypes: string[]) {
    return this.prisma.notificationPref.upsert({
      where: { userId },
      update: { mutedTypes },
      create: { userId, mutedTypes },
    });
  }

  mutedTypesFor(userIds: string[]) {
    if (userIds.length === 0) return Promise.resolve(new Map<string, Set<string>>());
    return this.prisma.notificationPref
      .findMany({ where: { userId: { in: userIds } } })
      .then((rows) => new Map(rows.map((row) => [row.userId, new Set(row.mutedTypes)])));
  }
}
