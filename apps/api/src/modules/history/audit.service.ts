import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditRepository, type AuditRecord } from './audit.repository';
import { buildMeta, normalizePagination } from '../../common/pagination';

export interface AuditQuery {
  page?: number;
  limit?: number;
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

@Injectable()
export class AuditService {
  constructor(@Inject(AuditRepository) private readonly audit: AuditRepository) {}

  record(input: AuditRecord, tx?: Prisma.TransactionClient) {
    return this.audit.record(input, tx);
  }

  /**
   * Role scoping (checkpoint H1#1): reviewers only ever see their own
   * actions (`actorId` forced to self, silently overriding any query value
   * so no cross-actor oracle exists). Admin/editor keep the full trail.
   */
  async list(query: AuditQuery, actor?: { sub: string; role: string }) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    const reviewer = actor?.role === 'reviewer' ? actor.sub : undefined;
    const { total, rows } = await this.audit.list(
      {
        actorId: reviewer ?? query.actorId,
        action: query.action,
        entityType: query.entityType,
        entityId: query.entityId,
        from: parseDate(query.from),
        to: parseDate(query.to),
      },
      (page - 1) * limit,
      limit,
    );
    return { data: rows, meta: buildMeta(page, limit, total) };
  }

  trail(
    entityType: string,
    entityId: string,
    query: Omit<AuditQuery, 'entityType' | 'entityId'>,
    actor?: { sub: string; role: string },
  ) {
    return this.list({ ...query, entityType, entityId }, actor);
  }
}
