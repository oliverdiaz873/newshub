import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RevisionRepository, type RevisionCause } from './revision.repository';
import { buildMeta, normalizePagination } from '../../common/pagination';

const MAX_VERSION_ATTEMPTS = 3;

function isUniqueConflict(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export interface RevisionSnapshot {
  translations: Array<{
    locale: string;
    slug: string;
    title: string;
    summary: string;
    coverAlt: string | null;
    content: unknown;
  }>;
  status: string;
  categoryId?: string | null;
  authorId?: string | null;
  coverMediaId?: string | null;
  isBreaking?: boolean;
  isFeatured?: boolean;
  publishedAt?: string | null;
  scheduledAt?: string | null;
}

/**
 * Versioned history writer. `record` computes the next monotonic version
 * and inserts inside the caller's transaction; concurrent writers collide
 * on the unique key and retry (bounded), so versions stay gapless per
 * entity under normal contention without serializable isolation.
 */
@Injectable()
export class RevisionsService {
  constructor(@Inject(RevisionRepository) private readonly revisions: RevisionRepository) {}

  async record(
    input: { entityType: string; entityId: string; actorId?: string | null; cause: RevisionCause; snapshot: RevisionSnapshot },
    tx: Prisma.TransactionClient,
  ) {
    let attempt = 0;
    for (;;) {
      attempt += 1;
      try {
        const version = await this.revisions.nextVersion(input.entityType, input.entityId, tx);
        const row = await this.revisions.create({ ...input, version }, tx);
        return { id: row.id, version };
      } catch (err) {
        if (isUniqueConflict(err) && attempt < MAX_VERSION_ATTEMPTS) continue;
        throw err;
      }
    }
  }

  async list(entityType: string, entityId: string, page?: number, limit?: number) {
    const { page: p, limit: l } = normalizePagination(page, limit);
    const { total, rows } = await this.revisions.list(entityType, entityId, (p - 1) * l, l);
    return { data: rows, meta: buildMeta(p, l, total) };
  }

  get(entityType: string, entityId: string, version: number) {
    return this.revisions.get(entityType, entityId, version);
  }

  latestVersion(entityType: string, entityId: string) {
    return this.revisions.latestVersion(entityType, entityId);
  }

  latestVersions(entityType: string, ids: string[]) {
    return this.revisions.latestVersions(entityType, ids);
  }
}
