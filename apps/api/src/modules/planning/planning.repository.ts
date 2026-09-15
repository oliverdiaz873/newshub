import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface PlanningFilters {
  status?: string;
  type?: string;
  assigneeId?: string;
  reviewerId?: string;
  /**
   * Reviewer queue scoping: items assigned to / reviewed by the user,
   * plus every item awaiting review. Combined with other filters via AND.
   */
  reviewerQueueFor?: string;
  q?: string;
  overdue?: boolean;
  dueFrom?: Date;
  dueTo?: Date;
}

const TERMINAL_STATUSES = ['done', 'cancelled'];

function filtersWhere(filters: PlanningFilters, now = new Date()): Prisma.PlanningItemWhereInput {
  const where: Prisma.PlanningItemWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters.reviewerId) where.reviewerId = filters.reviewerId;
  if (filters.reviewerQueueFor) {
    const id = filters.reviewerQueueFor;
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { OR: [{ assigneeId: id }, { reviewerId: id }, { status: 'in-review' }] },
    ];
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (filters.dueFrom || filters.dueTo) {
    where.dueAt = {
      ...(filters.dueFrom ? { gte: filters.dueFrom } : {}),
      ...(filters.dueTo ? { lte: filters.dueTo } : {}),
    };
  }
  if (filters.overdue === true) {
    where.dueAt = { ...(typeof where.dueAt === 'object' ? where.dueAt : {}), lt: now };
    where.status = filters.status ?? { notIn: TERMINAL_STATUSES };
  } else if (filters.overdue === false) {
    // ANDed (not ORed) so a text query keeps filtering: q AND not-overdue.
    const notOverdue: Prisma.PlanningItemWhereInput = {
      OR: [{ dueAt: null }, { dueAt: { gte: now } }, { status: { in: TERMINAL_STATUSES } }],
    };
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), notOverdue];
  }
  return where;
}

const INCLUDE = {
  category: { include: { translations: true } },
  assignee: { select: { id: true, email: true, displayName: true, role: true } },
  reviewer: { select: { id: true, email: true, displayName: true, role: true } },
} as const;

@Injectable()
export class PlanningRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findById(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).planningItem.findUnique({ where: { id }, include: INCLUDE });
  }

  async count(filters: PlanningFilters): Promise<number> {
    return this.prisma.planningItem.count({ where: filtersWhere(filters) });
  }

  list(filters: PlanningFilters, skip: number, take: number) {
    return this.prisma.planningItem.findMany({
      where: filtersWhere(filters),
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { updatedAt: 'desc' }],
      skip,
      take,
      include: INCLUDE,
    });
  }

  listDue(now: Date, take = 100) {
    return this.prisma.planningItem.findMany({
      where: { dueAt: { lte: now }, status: { notIn: TERMINAL_STATUSES } },
      orderBy: { dueAt: 'asc' },
      take,
      include: INCLUDE,
    });
  }

  listDueSoon(now: Date, horizon: Date, take = 100) {
    return this.prisma.planningItem.findMany({
      where: { dueAt: { gt: now, lte: horizon }, status: { notIn: TERMINAL_STATUSES } },
      orderBy: { dueAt: 'asc' },
      take,
      include: INCLUDE,
    });
  }

  create(
    input: {
      type: string;
      title: string;
      description?: string | null;
      categoryId?: string | null;
      assigneeId?: string | null;
      reviewerId?: string | null;
      priority?: string;
      dueAt?: Date | null;
      entityType?: string | null;
      entityId?: string | null;
      createdById: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).planningItem.create({
      data: {
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        categoryId: input.categoryId ?? null,
        assigneeId: input.assigneeId ?? null,
        reviewerId: input.reviewerId ?? null,
        priority: input.priority ?? 'normal',
        status: input.type === 'assignment' && input.assigneeId ? 'assigned' : 'pitched',
        dueAt: input.dueAt ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        createdById: input.createdById,
        updatedById: input.createdById,
      },
      include: INCLUDE,
    });
  }

  updateFields(
    id: string,
    input: {
      title?: string;
      description?: string | null;
      categoryId?: string | null;
      assigneeId?: string | null;
      reviewerId?: string | null;
      priority?: string;
      dueAt?: Date | null;
      entityType?: string | null;
      entityId?: string | null;
      updatedById: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).planningItem.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
        ...(input.reviewerId !== undefined ? { reviewerId: input.reviewerId } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
        ...(input.entityType !== undefined ? { entityType: input.entityType } : {}),
        ...(input.entityId !== undefined ? { entityId: input.entityId } : {}),
        updatedById: input.updatedById,
      },
      include: INCLUDE,
    });
  }

  setStatus(
    id: string,
    input: { status: string; assigneeId?: string | null; reviewerId?: string | null; updatedById: string },
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).planningItem.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
        ...(input.reviewerId !== undefined ? { reviewerId: input.reviewerId } : {}),
        updatedById: input.updatedById,
      },
      include: INCLUDE,
    });
  }

  deleteById(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).planningItem.delete({ where: { id } });
  }

  userExists(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).user
      .findUnique({ where: { id }, select: { id: true } })
      .then((row) => row !== null);
  }

  /** Audit-backed dedupe for periodic notifications: did this event fire since `since`? */
  async notifiedSince(entityId: string, action: string, since: Date): Promise<boolean> {
    const hit = await this.prisma.auditEvent.findFirst({
      where: { entityType: 'planning', entityId, action, at: { gte: since } },
      select: { id: true },
    });
    return hit !== null;
  }
}
