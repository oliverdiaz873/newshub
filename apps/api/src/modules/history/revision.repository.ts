import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type RevisionCause =
  | 'create'
  | 'edit'
  | `transition:${string}`
  | 'schedule.set'
  | 'schedule.clear'
  | 'schedule.execute'
  | 'restore';

/** Transaction-capable client: shared PrismaService or an interactive tx. */
export type Db = PrismaService | Prisma.TransactionClient;

export function dbOf(prisma: PrismaService, tx?: Prisma.TransactionClient): Db {
  return tx ?? prisma;
}

@Injectable()
export class RevisionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async nextVersion(entityType: string, entityId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const last = await dbOf(this.prisma, tx).revision.findFirst({
      where: { entityType, entityId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return (last?.version ?? 0) + 1;
  }

  create(
    input: { entityType: string; entityId: string; version: number; actorId?: string | null; cause: string; snapshot: unknown },
    tx?: Prisma.TransactionClient,
  ) {
    return dbOf(this.prisma, tx).revision.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        version: input.version,
        actorId: input.actorId ?? null,
        cause: input.cause,
        snapshot: input.snapshot as Prisma.InputJsonValue,
      },
    });
  }

  async list(entityType: string, entityId: string, skip: number, take: number, tx?: Prisma.TransactionClient) {
    const db = dbOf(this.prisma, tx);
    const [total, rows] = await Promise.all([
      db.revision.count({ where: { entityType, entityId } }),
      db.revision.findMany({
        where: { entityType, entityId },
        orderBy: { version: 'desc' },
        skip,
        take,
        include: { actor: { select: { id: true, email: true, displayName: true } } },
      }),
    ]);
    return { total, rows };
  }

  get(entityType: string, entityId: string, version: number, tx?: Prisma.TransactionClient) {
    return dbOf(this.prisma, tx).revision.findUnique({
      where: { entityType_entityId_version: { entityType, entityId, version } },
      include: { actor: { select: { id: true, email: true, displayName: true } } },
    });
  }

  latestVersion(entityType: string, entityId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return this.nextVersion(entityType, entityId, tx).then((next) => next - 1);
  }

  async latestVersions(entityType: string, ids: string[], tx?: Prisma.TransactionClient): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const groups = await dbOf(this.prisma, tx).revision.groupBy({
      by: ['entityId'],
      where: { entityType, entityId: { in: ids } },
      _max: { version: true },
    });
    return new Map(groups.map((g) => [g.entityId, g._max.version ?? 0]));
  }
}
