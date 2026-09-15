import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../history/audit.service';
import { NotificationsService, type NotificationType } from '../notifications/notifications.service';
import { CategoriesService } from '../categories/categories.service';
import { ArticlesService } from '../articles/articles.service';
import { OpinionsService } from '../opinions/opinions.service';
import { DEFAULT_LOCALE } from '../../common/locale';
import { buildMeta, normalizePagination } from '../../common/pagination';
import {
  isOverdue,
  resolvePlanningTransition,
  type PlanningAction,
} from '../../common/planning-transitions';
import { PlanningRepository } from './planning.repository';
import type { CreatePlanningDto, UpdatePlanningDto } from './dto/planning.dto';

export interface PlanningActor {
  sub: string;
  role: string;
}

@Injectable()
export class PlanningService {
  constructor(
    @Inject(PlanningRepository) private readonly planning: PlanningRepository,
    @Inject(CategoriesService) private readonly categories: CategoriesService,
    @Inject(ArticlesService) private readonly articles: ArticlesService,
    @Inject(OpinionsService) private readonly opinions: OpinionsService,
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  private toItem(row: Record<string, unknown>) {
    const dueAt = row.dueAt as Date | null;
    return {
      ...(row as object),
      dueAt: dueAt ? dueAt.toISOString() : null,
      overdue: isOverdue(row.status as string, dueAt),
    };
  }

  private scopeFor(actor: PlanningActor): { reviewerQueueFor?: string } {
    return actor.role === 'reviewer' ? { reviewerQueueFor: actor.sub } : {};
  }

  private async assertReferences(dto: {
    categoryId?: string | null;
    assigneeId?: string | null;
    reviewerId?: string | null;
  }): Promise<void> {
    if (dto.categoryId && !(await this.categories.exists(dto.categoryId))) {
      throw new NotFoundException('Category not found.');
    }
    for (const userId of [dto.assigneeId, dto.reviewerId]) {
      if (userId && !(await this.planning.userExists(userId))) {
        throw new NotFoundException('User not found.');
      }
    }
  }

  private notifyFlow(
    type: NotificationType,
    id: string,
    userId: string | undefined,
    payload?: Record<string, unknown> | null,
    extraUserIds?: string[],
  ): void {
    void this.notifications.emit({
      type,
      entityType: 'planning',
      entityId: id,
      actorId: userId ?? null,
      extraUserIds,
      payload: payload ?? null,
    });
  }

  async create(dto: CreatePlanningDto, userId: string) {
    await this.assertReferences(dto);
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    const row = await this.db.$transaction(async (tx) => {
      const created = await this.planning.create(
        {
          type: dto.type,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          categoryId: dto.categoryId ?? null,
          assigneeId: dto.assigneeId ?? null,
          reviewerId: dto.reviewerId ?? null,
          priority: dto.priority ?? 'normal',
          dueAt,
          entityType: dto.entityType ?? null,
          entityId: dto.entityId ?? null,
          createdById: userId,
        },
        tx,
      );
      await this.audit.record(
        { action: 'create', entityType: 'planning', entityId: created.id, actorId: userId },
        tx,
      );
      return created;
    });
    if (row.assigneeId) {
      this.notifyFlow('assigned', row.id, userId, { title: row.title }, [row.assigneeId]);
    }
    return this.toItem(row as unknown as Record<string, unknown>);
  }

  async read(id: string, actor: PlanningActor) {
    const row = await this.planning.findById(id);
    if (!row) throw new NotFoundException('Planning item not found.');
    if (actor.role === 'reviewer' && !this.visibleToReviewer(row, actor.sub)) {
      throw new NotFoundException('Planning item not found.');
    }
    return this.toItem(row as unknown as Record<string, unknown>);
  }

  private visibleToReviewer(
    row: { status: string; assigneeId: string | null; reviewerId: string | null },
    userId: string,
  ): boolean {
    return row.status === 'in-review' || row.assigneeId === userId || row.reviewerId === userId;
  }

  async list(
    query: { page?: number; limit?: number; status?: string; type?: string; assignee?: string; q?: string; overdue?: boolean },
    actor: PlanningActor,
  ) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    const filters = {
      status: query.status,
      type: query.type,
      assigneeId: query.assignee,
      q: query.q,
      overdue: query.overdue,
      ...this.scopeFor(actor),
    };
    const [total, rows] = await Promise.all([
      this.planning.count(filters),
      this.planning.list(filters, (page - 1) * limit, limit),
    ]);
    return { data: rows.map((r) => this.toItem(r as unknown as Record<string, unknown>)), meta: buildMeta(page, limit, total) };
  }

  async update(id: string, dto: UpdatePlanningDto, userId: string) {
    const existing = await this.planning.findById(id);
    if (!existing) throw new NotFoundException('Planning item not found.');
    await this.assertReferences(dto);
    const prevAssignee = existing.assigneeId as string | null;
    const row = await this.db.$transaction(async (tx) => {
      const updated = await this.planning.updateFields(
        id,
        {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
          ...(dto.reviewerId !== undefined ? { reviewerId: dto.reviewerId } : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.dueAt !== undefined ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null } : {}),
          ...(dto.entityType !== undefined ? { entityType: dto.entityType } : {}),
          ...(dto.entityId !== undefined ? { entityId: dto.entityId } : {}),
          updatedById: userId,
        },
        tx,
      );
      await this.audit.record(
        { action: 'update', entityType: 'planning', entityId: id, actorId: userId },
        tx,
      );
      return updated;
    });
    const nextAssignee = row.assigneeId as string | null;
    if (nextAssignee && nextAssignee !== prevAssignee) {
      this.notifyFlow('assigned', id, userId, { title: row.title as string }, [nextAssignee]);
    }
    return this.toItem(row as unknown as Record<string, unknown>);
  }

  async transition(id: string, action: PlanningAction, userId: string, opts?: { assigneeId?: string; reviewerId?: string }) {
    const row = await this.planning.findById(id);
    if (!row) throw new NotFoundException('Planning item not found.');
    if (action === 'assign' && !opts?.assigneeId && !(row.assigneeId as string | null)) {
      throw new ConflictException({
        code: 'missing_assignee',
        error: 'Conflict',
        message: 'Assign requires an assignee.',
      });
    }
    const target = resolvePlanningTransition(row.status as string, action);
    if (target === null) return this.toItem(row as unknown as Record<string, unknown>);
    if (opts?.assigneeId && !(await this.planning.userExists(opts.assigneeId))) {
      throw new NotFoundException('User not found.');
    }
    if (opts?.reviewerId && !(await this.planning.userExists(opts.reviewerId))) {
      throw new NotFoundException('User not found.');
    }
    const beforeStatus = row.status as string;
    const after = await this.db.$transaction(async (tx) => {
      const updated = await this.planning.setStatus(
        id,
        {
          status: target,
          ...(opts?.assigneeId !== undefined ? { assigneeId: opts.assigneeId } : {}),
          ...(opts?.reviewerId !== undefined ? { reviewerId: opts.reviewerId } : {}),
          updatedById: userId,
        },
        tx,
      );
      await this.audit.record(
        {
          action,
          entityType: 'planning',
          entityId: id,
          actorId: userId,
          metadata: { beforeStatus, afterStatus: target },
        },
        tx,
      );
      return updated;
    });
    const out = this.toItem(after as unknown as Record<string, unknown>);
    const assignee = after.assigneeId as string | null;
    if (action === 'assign' && assignee) {
      this.notifyFlow('assigned', id, userId, { title: after.title as string }, [assignee]);
    } else {
      this.notifyFlow(
        'planning.transition',
        id,
        userId,
        { title: after.title as string, beforeStatus, afterStatus: target },
        assignee ? [assignee] : undefined,
      );
    }
    return out;
  }

  async remove(id: string, userId: string): Promise<void> {
    const existing = await this.planning.findById(id);
    if (!existing) throw new NotFoundException('Planning item not found.');
    await this.db.$transaction(async (tx) => {
      await this.planning.deleteById(id, tx);
      await this.audit.record(
        { action: 'delete', entityType: 'planning', entityId: id, actorId: userId },
        tx,
      );
    });
  }

  /**
   * Calendar aggregation (read-only): planning items with due dates in range
   * plus scheduled article/opinion publishes. Consumes the Inc 5 scheduling
   * surface via listEditorial; never mutates schedules.
   */
  async calendar(from: Date | undefined, to: Date | undefined, actor: PlanningActor) {
    const filters = { dueFrom: from, dueTo: to, ...this.scopeFor(actor) };
    const items = await this.planning.list(filters, 0, 200);
    const locale = { requested: DEFAULT_LOCALE, resolved: DEFAULT_LOCALE, fallback: false as const };
    const [articles, opinions] = await Promise.all([
      this.articles.listEditorial({ scheduled: true, limit: 100 }, locale).catch(() => ({ data: [] })),
      this.opinions.listEditorial({ scheduled: true, limit: 100 }, locale).catch(() => ({ data: [] })),
    ]);
    const inRange = (iso: string | null) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime()) return false;
      return true;
    };
    const scheduled = [
      ...(articles.data ?? []).map((a: { id: string; title: string; slug: string; scheduledAt: string | null }) => ({
        kind: 'article' as const,
        id: a.id,
        title: a.title,
        slug: a.slug,
        scheduledAt: a.scheduledAt,
      })),
      ...(opinions.data ?? []).map((o: { id: string; title: string; slug: string; scheduledAt: string | null }) => ({
        kind: 'opinion' as const,
        id: o.id,
        title: o.title,
        slug: o.slug,
        scheduledAt: o.scheduledAt,
      })),
    ].filter((s) => inRange(s.scheduledAt));
    return {
      items: items.map((r) => this.toItem(r as unknown as Record<string, unknown>)),
      scheduled,
    };
  }

  /**
   * Periodic due-scan hook for the scheduling tick (no new cron): emits
   * `due.soon` (due within 24h) and `overdue` once per item, deduped via
   * audit events so repeats never spam. Never throws.
   */
  async dueScan(now: Date = new Date()): Promise<{ dueSoon: string[]; overdue: string[] }> {
    const dueSoon: string[] = [];
    const overdue: string[] = [];
    try {
      const horizon = new Date(now.getTime() + 24 * 3600_000);
      const [soon, late] = await Promise.all([
        this.planning.listDueSoon(now, horizon),
        this.planning.listDue(now),
      ]);
      for (const row of soon) {
        const item = row as unknown as { id: string; title: string; assigneeId: string | null; dueAt: Date };
        if (await this.planning.notifiedSince(item.id, 'notify.due-soon', new Date(0))) continue;
        const extra = item.assigneeId ? [item.assigneeId] : undefined;
        await this.audit.record({ action: 'notify.due-soon', entityType: 'planning', entityId: item.id });
        // System actor (null): the assignee must NOT be excluded from targets.
        this.notifyFlow('due.soon', item.id, undefined, { title: item.title, dueAt: item.dueAt.toISOString() }, extra);
        dueSoon.push(item.id);
      }
      for (const row of late) {
        const item = row as unknown as { id: string; title: string; assigneeId: string | null; dueAt: Date };
        if (await this.planning.notifiedSince(item.id, 'notify.overdue', new Date(0))) continue;
        const extra = item.assigneeId ? [item.assigneeId] : undefined;
        await this.audit.record({ action: 'notify.overdue', entityType: 'planning', entityId: item.id });
        // System actor (null): the assignee must NOT be excluded from targets.
        this.notifyFlow('overdue', item.id, undefined, { title: item.title, dueAt: item.dueAt.toISOString() }, extra);
        overdue.push(item.id);
      }
    } catch {
      // Best-effort by design; tick caller logs.
    }
    return { dueSoon, overdue };
  }

  /** Review queue unification: pending planning work for the Overview widget. */
  async reviewQueue(actor: PlanningActor, take = 20) {
    const rows = await this.planning.list({ status: 'in-review', ...this.scopeFor(actor) }, 0, take);
    return rows.map((r) => this.toItem(r as unknown as Record<string, unknown>));
  }
}
