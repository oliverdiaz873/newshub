import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { dbOf } from './revision.repository';

export interface AuditRecord {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  record(input: AuditRecord, tx?: Prisma.TransactionClient) {
    return dbOf(this.prisma, tx).auditEvent.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        actorId: input.actorId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async list(
    filters: { actorId?: string; action?: string; entityType?: string; entityId?: string; from?: Date; to?: Date },
    skip: number,
    take: number,
  ) {
    const db = this.prisma;
    const where: Prisma.AuditEventWhereInput = {};
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.from || filters.to) {
      where.at = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }
    const [total, rows] = await Promise.all([
      db.auditEvent.count({ where }),
      db.auditEvent.findMany({
        where,
        orderBy: { at: 'desc' },
        skip,
        take,
        include: { actor: { select: { id: true, email: true, displayName: true } } },
      }),
    ]);
    return { total, rows };
  }
}
