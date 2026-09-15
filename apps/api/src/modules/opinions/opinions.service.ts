import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RevisionsService, type RevisionSnapshot } from '../history/revisions.service';
import { AuditService } from '../history/audit.service';
import { SyndicationService } from '../syndication/syndication.service';
import { NotificationsService, type NotificationType } from '../notifications/notifications.service';
import type { RevisionCause } from '../history/revision.repository';
import { OpinionsRepository } from './opinions.repository';
import { AuthorsService } from '../authors/authors.service';
import { MediaRepository } from '../media/media.repository';
import type { CreateOpinionDto, UpdateOpinionDto } from '../editorial/dto/content-write.dto';
import { coverUrl } from '../media/cover-url';
import { DEFAULT_LOCALE, ResolvedLocale } from '../../common/locale';
import { buildMeta, normalizePagination } from '../../common/pagination';
import { resolveTransition, type TransitionAction } from '../../common/transitions';

interface TranslationRow {
  locale: string;
  slug: string;
  title: string;
  summary: string;
  coverAlt: string | null;
  content: unknown;
}

export interface OpinionListItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover: { url: string; alt: string } | null;
  author: { slug: string; name: string; bio: string | null };
  firstPublishedAt: string | null;
  scheduledAt: string | null;
  updatedAt: string;
  fallback: boolean;
}

export interface OpinionDetail extends OpinionListItem {
  content: string[];
  breadcrumb: { home: string; category: string; current: string };
  related: OpinionListItem[];
}

@Injectable()
export class OpinionsService {
  constructor(
    @Inject(OpinionsRepository) private readonly opinions: OpinionsRepository,
    @Inject(AuthorsService) private readonly authors: AuthorsService,
    @Inject(MediaRepository) private readonly media: MediaRepository,
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(RevisionsService) private readonly revisions: RevisionsService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(SyndicationService) private readonly syndication: SyndicationService,
  ) {}

  private notifyTitle(row: {
    translations: Array<{ locale: string; slug: string; title: string }>;
  }): { title: string; slug: string } | Record<string, never> {
    const t = row.translations.find((x) => x.locale === DEFAULT_LOCALE) ?? row.translations[0];
    return t ? { title: t.title, slug: t.slug } : {};
  }

  private notifyFlow(
    type: NotificationType,
    id: string,
    userId: string,
    payload?: Record<string, unknown> | null,
    extraUserIds?: string[],
  ): void {
    void this.notifications.emit({
      type,
      entityType: 'opinion',
      entityId: id,
      actorId: userId,
      extraUserIds,
      payload: payload ?? null,
    });
  }

  /**
   * Builds the revision snapshot from a post-mutation row. Dates are
   * ISO strings so the JSONB snapshot is self-describing and restorable.
   */
  private snapshotOpinion(
    row: {
      translations: Array<{ locale: string; slug: string; title: string; summary: string; coverAlt: string | null; content: unknown }>;
      status: string;
      authorId: string;
      coverMediaId: string | null;
      publishedAt: Date | null;
      scheduledAt: Date | null;
    },
    overrides?: { status?: string; publishedAt?: Date | null; scheduledAt?: Date | null },
  ): RevisionSnapshot {
    return {
      translations: row.translations.map((t) => ({
        locale: t.locale,
        slug: t.slug,
        title: t.title,
        summary: t.summary,
        coverAlt: t.coverAlt,
        content: t.content,
      })),
      status: overrides?.status ?? row.status,
      authorId: row.authorId,
      coverMediaId: row.coverMediaId,
      publishedAt: (overrides?.publishedAt ?? row.publishedAt)?.toISOString() ?? null,
      scheduledAt: (overrides?.scheduledAt ?? row.scheduledAt)?.toISOString() ?? null,
    };
  }

  /**
   * Webhook fan-out (Increment 10). Post-commit, best-effort. Never throws.
   */
  private async syndicationFanout(
    action: 'publish' | 'unpublish',
    id: string,
    out: {
      translations: Array<{ locale: string; slug: string; title: string; summary: string }>;
      authorId: string;
      firstPublishedAt: string | null;
    },
  ): Promise<void> {
    try {
      const es = out.translations.find((t) => t.locale === DEFAULT_LOCALE) ?? out.translations[0];
      const author = await this.authors.viewFor(out.authorId, DEFAULT_LOCALE).catch(() => null);
      await this.syndication.fanout('opinion', id, action === 'publish' ? 'published' : 'unpublished', {
        title: es?.title ?? '',
        slug: es?.slug ?? '',
        summary: es?.summary ?? '',
        categorySlug: null,
        authorName: author?.name ?? null,
        ...(action === 'publish'
          ? { publishedAt: out.firstPublishedAt }
          : { unpublishedAt: new Date().toISOString() }),
      });
    } catch {
      // Best-effort; fanout itself never rejects either.
    }
  }

  private async recordHistory(
    tx: Prisma.TransactionClient,
    input: { entityId: string; actorId?: string | null; cause: RevisionCause; snapshot: RevisionSnapshot; action: string; metadata?: Record<string, unknown> },
  ): Promise<number> {
    const { version } = await this.revisions.record(
      { entityType: 'opinion', entityId: input.entityId, actorId: input.actorId, cause: input.cause, snapshot: input.snapshot },
      tx,
    );
    await this.audit.record(
      {
        action: input.action,
        entityType: 'opinion',
        entityId: input.entityId,
        actorId: input.actorId,
        metadata: { version, ...(input.metadata ?? {}) },
      },
      tx,
    );
    return version;
  }

  async list(
    query: { page?: number; limit?: number; author?: string; q?: string; sort?: 'publishedAt:desc' | 'publishedAt:asc' },
    locale: ResolvedLocale,
  ) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    let authorId: string | undefined;
    if (query.author) {
      const author = await this.opinions.findAuthorIdBySlug(query.author);
      if (!author) throw new NotFoundException('Author not found.');
      authorId = author.id;
    }
    const filters = { authorId, q: query.q?.trim() ? query.q.trim() : undefined, sort: query.sort ?? 'publishedAt:desc' };
    const total = await this.opinions.countPublished(filters);
    const rows = await this.opinions.listPublished(filters, (page - 1) * limit, limit);
    const data = await Promise.all(rows.map((row) => this.toListItem(row, locale)));
    return {
      data,
      meta: buildMeta(page, limit, total),
      localeRequested: locale.requested,
      localeResolved: locale.resolved,
      fallback: data.some((item) => item.fallback),
    };
  }

  async detail(slug: string, locale: ResolvedLocale): Promise<OpinionDetail & { localeRequested: string; localeResolved: string }> {
    const hit = await this.opinions.findBySlug(slug, locale.resolved);
    if (!hit) {
      if (locale.resolved !== DEFAULT_LOCALE) {
        const es = await this.opinions.findBySlug(slug, DEFAULT_LOCALE);
        if (es) return this.toDetail(es.opinion, locale, true, slug);
      }
      throw new NotFoundException('Opinion not found.');
    }
    return this.toDetail(hit.opinion, locale, false, slug);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async toListItem(row: any, locale: ResolvedLocale): Promise<OpinionListItem> {
    const translations = row.translations as TranslationRow[];
    const direct = translations.find((t) => t.locale === locale.resolved)
      ?? translations.find((t) => t.locale === DEFAULT_LOCALE);
    const usedLocale = direct?.locale ?? locale.resolved;
    const author = await this.authors.viewFor(row.authorId as string, usedLocale);
    if (!author) throw new NotFoundException('Author not found.');
    return {
      id: row.id as string,
      slug: direct?.slug ?? '',
      title: direct?.title ?? '',
      summary: direct?.summary ?? '',
      cover: row.cover ? {
        url: coverUrl(row.cover as { id: string; storageKey: string }),
        alt: direct?.coverAlt ?? direct?.title ?? '',
      } : null,
      author,
      firstPublishedAt: row.publishedAt ? (row.publishedAt as Date).toISOString() : null,
      scheduledAt: row.scheduledAt ? (row.scheduledAt as Date).toISOString() : null,
      updatedAt: (row.updatedAt as Date).toISOString(),
      fallback: usedLocale !== locale.resolved,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async toDetail(row: any, locale: ResolvedLocale, fallback: boolean, slug: string) {
    const translations = row.translations as TranslationRow[];
    const resolvedLocale = fallback ? DEFAULT_LOCALE : locale.resolved;
    const t = translations.find((x) => x.locale === resolvedLocale);
    if (!t || t.slug !== slug) throw new NotFoundException('Opinion not found.');
    const item = await this.toListItem(row, fallback
      ? { requested: locale.requested, resolved: DEFAULT_LOCALE, fallback: true }
      : locale);
    const relatedRows = await this.opinions.findRelated(row.id as string, 3);
    const related = await Promise.all(relatedRows.map((r) => this.toListItem(r, locale)));
    return {
      ...item,
      fallback,
      content: Array.isArray(t.content) ? (t.content as unknown[]).filter((p): p is string => typeof p === 'string') : [],
      breadcrumb: {
        home: locale.requested === 'en' ? 'Home' : 'Inicio',
        category: locale.requested === 'en' ? 'Opinion' : 'Opinión',
        current: t.title,
      },
      related,
      localeRequested: locale.requested,
      localeResolved: resolvedLocale,
    };
  }

  // ---- Editorial writes (F3: draft-only, auth + RBAC at the controller) ----

  async create(dto: CreateOpinionDto, userId: string) {
    this.requireCreateDraft(dto.status);
    this.requireSpanish(dto.translations);
    if (!(await this.authors.exists(dto.authorId))) {
      throw new NotFoundException('Author not found.');
    }
    if (dto.coverMediaId && !(await this.media.findById(dto.coverMediaId))) {
      throw new NotFoundException('Media asset not found.');
    }
    await this.assertSlugsFree(dto.translations);
    try {
      const id = await this.db.$transaction(async (tx) => {
        const row = await this.opinions.createWithTranslations({
          authorId: dto.authorId,
          coverMediaId: dto.coverMediaId ?? null,
          createdById: userId,
          translations: dto.translations,
        }, tx);
        const after = await this.opinions.findByIdFull(row.id, tx);
        if (!after) throw new NotFoundException('Opinion not found.');
        await this.recordHistory(tx, {
          entityId: row.id,
          actorId: userId,
          cause: 'create',
          snapshot: this.snapshotOpinion(after),
          action: 'create',
        });
        return row.id;
      });
      return this.read(id);
    } catch (err) {
      throw this.asSlugConflict(err);
    }
  }

  async update(id: string, dto: UpdateOpinionDto, userId: string) {
    const existing = await this.opinions.findByIdFull(id);
    if (!existing) throw new NotFoundException('Opinion not found.');
    const targetStatus = this.resolvePatchStatus(existing.status, dto.status);
    if (dto.authorId === null) {
      throw new UnprocessableEntityException('Author is required.');
    }
    if (dto.authorId !== undefined && !(await this.authors.exists(dto.authorId))) {
      throw new NotFoundException('Author not found.');
    }
    if (dto.coverMediaId !== undefined && dto.coverMediaId !== null && !(await this.media.findById(dto.coverMediaId))) {
      throw new NotFoundException('Media asset not found.');
    }
    if (dto.translations) {
      await this.assertSlugsFree(dto.translations, id);
    }
    try {
      await this.db.$transaction(async (tx) => {
        for (const t of dto.translations ?? []) {
          try {
            await this.opinions.upsertTranslation(id, t, tx);
          } catch (err) {
            throw this.asSlugConflict(err);
          }
        }
        await this.opinions.updateFields(id, {
          authorId: dto.authorId ?? undefined,
          coverMediaId: dto.coverMediaId,
          status: targetStatus,
          updatedById: userId,
        }, tx);
        const after = await this.opinions.findByIdFull(id, tx);
        if (!after?.translations.some((t) => t.locale === DEFAULT_LOCALE)) {
          throw new UnprocessableEntityException('Spanish translation is required.');
        }
        await this.recordHistory(tx, {
          entityId: id,
          actorId: userId,
          cause: 'edit',
          snapshot: this.snapshotOpinion(after),
          action: 'update',
        });
      });
    } catch (err) {
      throw this.asSlugConflict(err);
    }
    const out = await this.read(id);
    if (targetStatus === 'review') {
      const authorId = (existing as { createdById?: string | null }).createdById ?? undefined;
      this.notifyFlow('review.requested', id, userId, this.notifyTitle(out), authorId ? [authorId] : undefined);
    }
    return out;
  }

  async remove(id: string, userId?: string) {
    const existing = await this.opinions.findByIdFull(id);
    if (!existing) throw new NotFoundException('Opinion not found.');
    await this.db.$transaction(async (tx) => {
      await this.opinions.deleteById(id, tx);
      await this.audit.record({
        action: 'delete',
        entityType: 'opinion',
        entityId: id,
        actorId: userId ?? existing.updatedById,
        metadata: { status: existing.status, snapshot: this.snapshotOpinion(existing) },
      }, tx);
    });
  }

  /**
   * Publishing transitions (F4). `firstPublishedAt` is set once on the first
   * publish and never rewritten; unpublish keeps history; audit tracks the actor.
   */
  async transition(id: string, action: TransitionAction, userId: string, opts?: { reason?: string }) {
    const row = await this.opinions.findByIdFull(id);
    if (!row) throw new NotFoundException('Opinion not found.');
    const target = resolveTransition(row.status, action);
    if (target === null) return this.read(id);
    if (action === 'publish' && !row.translations.some((t) => t.locale === DEFAULT_LOCALE)) {
      throw new UnprocessableEntityException('Spanish translation is required to publish.');
    }
    const reason = opts?.reason?.trim() ? opts.reason.trim().slice(0, 500) : undefined;
    const beforeStatus = row.status;
    await this.db.$transaction(async (tx) => {
      await this.opinions.setStatus(id, {
        status: target,
        publishedAt: action === 'publish' && !row.publishedAt ? new Date() : undefined,
        // Any explicit transition leaves review: a pending schedule is cancelled.
        scheduledAt: null,
        scheduledById: null,
        updatedById: userId,
      }, tx);
      const after = await this.opinions.findByIdFull(id, tx);
      if (!after) throw new NotFoundException('Opinion not found.');
      await this.recordHistory(tx, {
        entityId: id,
        actorId: userId,
        cause: `transition:${action}`,
        snapshot: this.snapshotOpinion(after),
        action,
        metadata: { beforeStatus, afterStatus: target, ...(reason ? { reason } : {}) },
      });
    });
    const out = await this.read(id);
    const notice: Partial<Record<TransitionAction, NotificationType>> = {
      publish: 'published',
      reject: 'rejected',
      unpublish: 'unpublished',
      archive: 'archived',
    };
    const event = notice[action];
    if (event) {
      const authorId = (row as { createdById?: string | null }).createdById ?? undefined;
      this.notifyFlow(event, id, userId, { ...this.notifyTitle(out), ...(reason ? { reason } : {}) }, authorId ? [authorId] : undefined);
    }
    if (action === 'publish' || action === 'unpublish') {
      void this.syndicationFanout(action, id, out);
    }
    return out;
  }

  /**
   * Scheduling (Increment 5). Review-only: drafting items cannot be
   * scheduled, so automation never skips the editorial review gate.
   * The instant must be in the future; clearing is idempotent.
   */
  async schedule(id: string, at: Date, userId: string) {
    const row = await this.opinions.findByIdFull(id);
    if (!row) throw new NotFoundException('Opinion not found.');
    if (row.status !== 'review') {
      throw new ConflictException({
        code: 'invalid_transition',
        error: 'Conflict',
        message: `Cannot schedule from '${row.status}'. Only items in review can be scheduled.`,
      });
    }
    if (!(at.getTime() > Date.now())) {
      throw new UnprocessableEntityException('scheduledAt must be in the future.');
    }
    await this.db.$transaction(async (tx) => {
      await this.opinions.setSchedule(id, { scheduledAt: at, scheduledById: userId, updatedById: userId }, tx);
      const after = await this.opinions.findByIdFull(id, tx);
      if (!after) throw new NotFoundException('Opinion not found.');
      await this.recordHistory(tx, {
        entityId: id,
        actorId: userId,
        cause: 'schedule.set',
        snapshot: this.snapshotOpinion(after),
        action: 'schedule.set',
        metadata: { scheduledAt: at.toISOString() },
      });
    });
    return this.read(id);
  }

  async unschedule(id: string, userId: string) {
    const row = await this.opinions.findByIdFull(id);
    if (!row) throw new NotFoundException('Opinion not found.');
    if (row.scheduledAt === null) return this.read(id);
    await this.db.$transaction(async (tx) => {
      await this.opinions.clearSchedule(id, userId, tx);
      const after = await this.opinions.findByIdFull(id, tx);
      if (!after) throw new NotFoundException('Opinion not found.');
      await this.recordHistory(tx, {
        entityId: id,
        actorId: userId,
        cause: 'schedule.clear',
        snapshot: this.snapshotOpinion(after),
        action: 'schedule.clear',
      });
    });
    return this.read(id);
  }

  /**
   * Restore a revision as a new version (history is never rewritten).
   * Content fields, relations, and flags come from the snapshot; status
   * never does (published items must unpublish first, like manual edits).
   */
  async restoreRevision(id: string, version: number, userId: string) {
    const revision = await this.revisions.get('opinion', id, version);
    if (!revision) throw new NotFoundException('Revision not found.');
    const row = await this.opinions.findByIdFull(id);
    if (!row) throw new NotFoundException('Opinion not found.');
    if (row.status === 'published') {
      throw new ConflictException({
        code: 'invalid_transition',
        error: 'Conflict',
        message: `Cannot restore a published opinion. Unpublish it first.`,
      });
    }
    const snap = revision.snapshot as unknown as RevisionSnapshot;
    await this.db.$transaction(async (tx) => {
      const current = await this.opinions.findByIdFull(id, tx);
      if (!current) throw new NotFoundException('Opinion not found.');
      if (current.status === 'published') {
        throw new ConflictException({
          code: 'invalid_transition',
          error: 'Conflict',
          message: `Cannot restore a published opinion. Unpublish it first.`,
        });
      }
      for (const t of snap.translations) {
        await this.opinions.upsertTranslation(id, {
          locale: t.locale,
          slug: t.slug,
          title: t.title,
          summary: t.summary,
          coverAlt: t.coverAlt,
          content: Array.isArray(t.content) ? t.content.filter((p): p is string => typeof p === 'string') : [],
        }, tx);
      }
      await this.opinions.updateFields(id, {
        authorId: snap.authorId ?? undefined,
        coverMediaId: snap.coverMediaId === null ? null : (snap.coverMediaId ?? undefined),
        updatedById: userId,
      }, tx);
      const after = await this.opinions.findByIdFull(id, tx);
      if (!after?.translations.some((t) => t.locale === DEFAULT_LOCALE)) {
        throw new UnprocessableEntityException('Spanish translation is required.');
      }
      await this.recordHistory(tx, {
        entityId: id,
        actorId: userId,
        cause: 'restore',
        snapshot: this.snapshotOpinion(after),
        action: 'revision.restore',
        metadata: { restoredVersion: version },
      });
    });
    return this.read(id);
  }

  async listRevisions(id: string, page?: number, limit?: number) {
    const row = await this.opinions.findByIdFull(id);
    if (!row) throw new NotFoundException('Opinion not found.');
    return this.revisions.list('opinion', id, page, limit);
  }

  async getRevision(id: string, version: number) {
    const row = await this.opinions.findByIdFull(id);
    if (!row) throw new NotFoundException('Opinion not found.');
    const revision = await this.revisions.get('opinion', id, version);
    if (!revision) throw new NotFoundException('Revision not found.');
    return revision;
  }

  /**
   * Executor step (Increment 5): publishes due review items, each claimed
   * atomically (multi-instance safe). Items failing validation keep their
   * schedule for the next tick and stay visible as overdue; failures are
   * logged by the caller (schedule.failed hook for Inc 7 notifications).
   */
  async publishDue(now: Date, take = 20): Promise<{ published: string[]; failed: Array<{ id: string; code: string }> }> {
    const due = await this.opinions.findDue(now, take);
    const published: string[] = [];
    const failed: Array<{ id: string; code: string }> = [];
    for (const row of due) {
      try {
        const outcome: 'claimed' | 'skipped' | 'failed:unprocessable' = await this.db.$transaction(async (tx) => {
          const full = await this.opinions.findByIdFull(row.id, tx);
          if (!full || full.status !== 'review' || !full.scheduledAt || full.scheduledAt > now) return 'skipped';
          if (!full.translations.some((t) => t.locale === DEFAULT_LOCALE)) return 'failed:unprocessable';
          const actor = full.scheduledById ?? full.updatedById ?? undefined;
          const claimed = await this.opinions.publishDue(
            full.id,
            full.scheduledAt,
            full.publishedAt ?? now,
            actor ?? undefined,
            tx,
          );
          if (claimed.count === 0) return 'skipped';
          const publishedAt = full.publishedAt ?? now;
          await this.recordHistory(tx, {
            entityId: full.id,
            actorId: full.scheduledById,
            cause: 'schedule.execute',
            snapshot: this.snapshotOpinion(full, { status: 'published', publishedAt, scheduledAt: null }),
            action: 'publish',
            metadata: { via: 'schedule.execute' },
          });
          return 'claimed';
        });
        if (outcome === 'claimed') published.push(row.id);
        else if (outcome === 'failed:unprocessable') failed.push({ id: row.id, code: 'unprocessable' });
      } catch {
        failed.push({ id: row.id, code: 'failed' });
      }
    }
    return { published, failed };
  }

  /**
   * PATCH status policy (documented F3 exception): only `review` may be set,
   * and only from `draft` (idempotent when already `review`). Anything else
   * must go through the transition endpoints.
   */
  private resolvePatchStatus(current: string, requested: string | undefined): string | undefined {
    if (requested === undefined || requested === 'draft') {
      if (requested === 'draft' && current !== 'draft') {
        throw new ConflictException({
          code: 'invalid_transition',
          error: 'Conflict',
          message: `Cannot set status to 'draft' from '${current}'. Use the transition endpoints.`,
        });
      }
      return undefined;
    }
    if (requested === 'review') {
      if (current === 'review') return undefined;
      if (current !== 'draft') {
        throw new ConflictException({
          code: 'invalid_transition',
          error: 'Conflict',
          message: `Cannot set status to 'review' from '${current}'.`,
        });
      }
      return 'review';
    }
    throw new UnprocessableEntityException('Only draft or review status is allowed via PATCH (F4 owns transitions).');
  }

  private requireCreateDraft(status: string | undefined) {
    if (status !== undefined && status !== 'draft') {
      throw new UnprocessableEntityException('Only draft status is allowed on create (F4 owns transitions).');
    }
  }

  private requireSpanish(translations: Array<{ locale: string }>) {
    if (!translations.some((t) => t.locale === DEFAULT_LOCALE)) {
      throw new UnprocessableEntityException('Spanish translation is required.');
    }
  }

  private async assertSlugsFree(
    translations: Array<{ locale: string; slug: string }>,
    excludeOpinionId?: string,
  ) {
    for (const t of translations) {
      const hit = await this.opinions.findTranslationBySlug(t.locale, t.slug);
      if (hit && hit.opinionId !== excludeOpinionId) {
        throw new ConflictException({
          code: 'slug_taken',
          error: 'Conflict',
          message: `Slug '${t.slug}' is already taken for locale '${t.locale}'.`,
        });
      }
    }
  }

  private asSlugConflict(err: unknown): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException({
        code: 'slug_taken',
        error: 'Conflict',
        message: 'Slug is already taken for this locale.',
      });
    }
    throw err;
  }

  // ---- Editorial reads (auth enforced at the editorial controller) ----

  async listEditorial(
    query: { page?: number; limit?: number; status?: string; author?: string; q?: string; scheduled?: boolean; overdue?: boolean },
    locale: ResolvedLocale,
  ) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    let authorId: string | undefined;
    if (query.author) {
      const author = await this.opinions.findAuthorIdBySlug(query.author);
      if (!author) throw new NotFoundException('Author not found.');
      authorId = author.id;
    }
    const filters = { status: query.status, authorId, q: query.q?.trim() ? query.q.trim() : undefined, scheduled: query.scheduled, overdue: query.overdue };
    const total = await this.opinions.countAny(filters);
    const rows = await this.opinions.listAny(filters, (page - 1) * limit, limit);
    const data = await Promise.all(
      rows.map(async (row) => ({ ...(await this.toListItem(row, locale)), status: row.status as string })),
    );
    const versions = await this.revisions.latestVersions(
      'opinion',
      rows.map((row) => row.id as string),
    );
    const versioned = data.map((item) => ({ ...item, version: versions.get(item.id) ?? 0 }));
    return {
      data: versioned,
      meta: buildMeta(page, limit, total),
      localeRequested: locale.requested,
      localeResolved: locale.resolved,
      fallback: versioned.some((item) => item.fallback),
    };
  }

  async read(id: string) {
    const row = await this.opinions.findByIdFull(id);
    if (!row) throw new NotFoundException('Opinion not found.');
    const version = await this.revisions.latestVersion('opinion', id);
    return {
      id: row.id,
      version,
      authorId: row.authorId,
      coverMediaId: row.coverMediaId,
      status: row.status,
      firstPublishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      translations: row.translations.map((t) => ({
        locale: t.locale,
        slug: t.slug,
        title: t.title,
        summary: t.summary,
        coverAlt: t.coverAlt,
        content: Array.isArray(t.content)
          ? (t.content as unknown[]).filter((p): p is string => typeof p === 'string')
          : [],
      })),
    };
  }
}
