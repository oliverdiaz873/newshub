import { ConflictException, Inject, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RevisionsService, type RevisionSnapshot } from '../history/revisions.service';
import { AuditService } from '../history/audit.service';
import { NotificationsService, type NotificationType } from '../notifications/notifications.service';
import { SyndicationService } from '../syndication/syndication.service';
import type { RevisionCause } from '../history/revision.repository';
import { ArticlesRepository } from './articles.repository';
import { AuthorsService } from '../authors/authors.service';
import { CategoriesService } from '../categories/categories.service';
import { MediaRepository } from '../media/media.repository';
import type { CreateArticleDto, UpdateArticleDto } from '../editorial/dto/content-write.dto';
import type { BulkAction } from './dto/bulk.dto';
import { BULK_MAX_IDS, toBulkCode, type BulkItemResult } from './bulk-codes';
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

export interface ArticleListItem {
  id: string;
  slug: string;
  categorySlug: string;
  title: string;
  summary: string;
  cover: { url: string; alt: string } | null;
  author: { slug: string; name: string; bio: string | null } | null;
  firstPublishedAt: string | null;
  scheduledAt: string | null;
  updatedAt: string;
  fallback: boolean;
  isBreaking: boolean;
  isFeatured: boolean;
}

export interface ArticleDetail extends ArticleListItem {
  content: string[];
  breadcrumb: { home: string; category: string; current: string };
  related: ArticleListItem[];
}

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(
    @Inject(ArticlesRepository) private readonly articles: ArticlesRepository,
    @Inject(AuthorsService) private readonly authors: AuthorsService,
    @Inject(CategoriesService) private readonly categories: CategoriesService,
    @Inject(MediaRepository) private readonly media: MediaRepository,
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(RevisionsService) private readonly revisions: RevisionsService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(SyndicationService) private readonly syndication: SyndicationService,
  ) {}

  /**
   * Builds the revision snapshot from a post-mutation row. Dates are
   * ISO strings so the JSONB snapshot is self-describing and restorable.
   */
  private snapshotArticle(
    row: {
      translations: Array<{ locale: string; slug: string; title: string; summary: string; coverAlt: string | null; content: unknown }>;
      status: string;
      categoryId: string;
      authorId: string | null;
      coverMediaId: string | null;
      isBreaking: boolean;
      isFeatured: boolean;
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
      categoryId: row.categoryId,
      authorId: row.authorId,
      coverMediaId: row.coverMediaId,
      isBreaking: row.isBreaking,
      isFeatured: row.isFeatured,
      publishedAt: (overrides?.publishedAt ?? row.publishedAt)?.toISOString() ?? null,
      scheduledAt: (overrides?.scheduledAt ?? row.scheduledAt)?.toISOString() ?? null,
    };
  }

  private notifyTitle(row: {
    translations: Array<{ locale: string; slug: string; title: string }>;
  }): { title: string; slug: string } | Record<string, never> {
    const t = row.translations.find((x) => x.locale === DEFAULT_LOCALE) ?? row.translations[0];
    return t ? { title: t.title, slug: t.slug } : {};
  }

  /**
   * Post-commit notification fan-out (Increment 7). Best-effort by design:
   * `emit` never rejects, so a fan-out drop can never break the editorial
   * action it follows (see NotificationsService).
   */
  private notifyFlow(
    type: NotificationType,
    id: string,
    userId: string,
    payload?: Record<string, unknown> | null,
    extraUserIds?: string[],
  ): void {
    void this.notifications.emit({
      type,
      entityType: 'article',
      entityId: id,
      actorId: userId,
      extraUserIds,
      payload: payload ?? null,
    });
  }

  /**
   * Webhook fan-out (Increment 10). Post-commit, best-effort: resolves public
   * display fields and enqueues per-subscription deliveries. Never throws.
   */
  private async syndicationFanout(
    action: 'publish' | 'unpublish',
    id: string,
    out: {
      translations: Array<{ locale: string; slug: string; title: string; summary: string }>;
      categoryId: string;
      authorId: string | null;
      firstPublishedAt: string | null;
    },
  ): Promise<void> {
    try {
      const es = out.translations.find((t) => t.locale === DEFAULT_LOCALE) ?? out.translations[0];
      const [categorySlug, author] = await Promise.all([
        this.categories.slugFor(out.categoryId).catch(() => null),
        out.authorId ? this.authors.viewFor(out.authorId, DEFAULT_LOCALE).catch(() => null) : null,
      ]);
      await this.syndication.fanout('article', id, action === 'publish' ? 'published' : 'unpublished', {
        title: es?.title ?? '',
        slug: es?.slug ?? '',
        summary: es?.summary ?? '',
        categorySlug,
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
      { entityType: 'article', entityId: input.entityId, actorId: input.actorId, cause: input.cause, snapshot: input.snapshot },
      tx,
    );
    await this.audit.record(
      {
        action: input.action,
        entityType: 'article',
        entityId: input.entityId,
        actorId: input.actorId,
        metadata: { version, ...(input.metadata ?? {}) },
      },
      tx,
    );
    return version;
  }

  async list(
    query: { page?: number; limit?: number; category?: string; author?: string; q?: string; sort?: 'publishedAt:desc' | 'publishedAt:asc'; breaking?: boolean; featured?: boolean },
    locale: ResolvedLocale,
  ) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    const filters = await this.resolveFilters(query, locale);
    const total = await this.articles.countPublished(filters);
    const rows = await this.articles.listPublished(filters, (page - 1) * limit, limit);
    const data = await Promise.all(rows.map((row) => this.toListItem(row, locale)));
    return {
      data,
      meta: buildMeta(page, limit, total),
      localeRequested: locale.requested,
      localeResolved: locale.resolved,
      fallback: data.some((item) => item.fallback),
    };
  }

  async detail(slug: string, locale: ResolvedLocale): Promise<ArticleDetail & { localeRequested: string; localeResolved: string }> {    const hit = await this.articles.findBySlug(slug, locale.resolved);
    if (!hit) {
      if (locale.resolved !== DEFAULT_LOCALE) {
        const es = await this.articles.findBySlug(slug, DEFAULT_LOCALE);
        if (es) return this.toDetail(es.article, locale, true, slug);
      }
      throw new NotFoundException('Article not found.');
    }
    return this.toDetail(hit.article, locale, false, slug);
  }

  private async resolveFilters(
    query: { category?: string; author?: string; q?: string; sort?: 'publishedAt:desc' | 'publishedAt:asc'; breaking?: boolean; featured?: boolean; scheduled?: boolean; overdue?: boolean },
    locale: ResolvedLocale,
  ) {
    let categoryId: string | undefined;
    if (query.category) {
      const cat = await this.articles.findCategoryIdBySlug(query.category, locale.resolved)
        ?? await this.articles.findCategoryIdBySlug(query.category, DEFAULT_LOCALE);
      if (!cat) throw new NotFoundException('Category not found.');
      categoryId = cat.categoryId;
    }
    let authorId: string | undefined;
    if (query.author) {
      const author = await this.articles.findAuthorIdBySlug(query.author);
      if (!author) throw new NotFoundException('Author not found.');
      authorId = author.id;
    }
    return {
      categoryId,
      authorId,
      q: query.q?.trim() ? query.q.trim() : undefined,
      sort: query.sort ?? 'publishedAt:desc',
      breaking: query.breaking,
      featured: query.featured,
      scheduled: query.scheduled,
      overdue: query.overdue,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async toListItem(row: any, locale: ResolvedLocale): Promise<ArticleListItem> {
    const translations = row.translations as TranslationRow[];
    const direct = translations.find((t) => t.locale === locale.resolved)
      ?? translations.find((t) => t.locale === DEFAULT_LOCALE);
    const usedLocale = direct?.locale ?? locale.resolved;
    const categorySlug = this.pickSlug(row.category?.translations ?? [], locale) ?? '';
    return {
      id: row.id as string,
      slug: direct?.slug ?? '',
      categorySlug,
      title: direct?.title ?? '',
      summary: direct?.summary ?? '',
      cover: row.cover ? {
        url: coverUrl(row.cover as { id: string; storageKey: string }),
        alt: direct?.coverAlt ?? direct?.title ?? '',
      } : null,
      author: row.authorId ? await this.authors.viewFor(row.authorId as string, usedLocale) : null,
      firstPublishedAt: row.publishedAt ? (row.publishedAt as Date).toISOString() : null,
      scheduledAt: row.scheduledAt ? (row.scheduledAt as Date).toISOString() : null,
      updatedAt: (row.updatedAt as Date).toISOString(),
      fallback: usedLocale !== locale.resolved,
      isBreaking: (row.isBreaking as boolean) ?? false,
      isFeatured: (row.isFeatured as boolean) ?? false,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async toDetail(row: any, locale: ResolvedLocale, fallback: boolean, slug: string) {
    const translations = row.translations as TranslationRow[];
    const resolvedLocale = fallback ? DEFAULT_LOCALE : locale.resolved;
    const t = translations.find((x) => x.locale === resolvedLocale);
    if (!t || t.slug !== slug) throw new NotFoundException('Article not found.');
    const item = await this.toListItem(row, fallback
      ? { requested: locale.requested, resolved: DEFAULT_LOCALE, fallback: true }
      : locale);
    const relatedRows = await this.articles.findRelated(row.categoryId as string, row.id as string, 3);
    const related = await Promise.all(relatedRows.map((r) => this.toListItem(r, locale)));
    const categoryLabel = this.pickLabel(row.category?.translations ?? [], fallback ? DEFAULT_LOCALE : locale.resolved);
    return {
      ...item,
      fallback,
      content: Array.isArray(t.content) ? (t.content as unknown[]).filter((p): p is string => typeof p === 'string') : [],
      breadcrumb: {
        home: locale.requested === 'en' ? 'Home' : 'Inicio',
        category: categoryLabel,
        current: t.title,
      },
      related,
      localeRequested: locale.requested,
      localeResolved: resolvedLocale,
    };
  }

  private pickSlug(translations: Array<{ locale: string; slug: string }>, locale: ResolvedLocale): string | undefined {
    return translations.find((t) => t.locale === locale.resolved)?.slug
      ?? translations.find((t) => t.locale === DEFAULT_LOCALE)?.slug;
  }

  private pickLabel(translations: Array<{ locale: string; label: string }>, locale: string): string {
    return translations.find((t) => t.locale === locale)?.label
      ?? translations.find((t) => t.locale === DEFAULT_LOCALE)?.label ?? '';
  }

  // ---- Editorial writes (F3: draft-only, auth + RBAC at the controller) ----

  async create(dto: CreateArticleDto, userId: string) {
    this.requireCreateDraft(dto.status);
    this.requireSpanish(dto.translations);
    await this.assertReferences(dto.categoryId, dto.authorId, dto.coverMediaId);
    await this.assertSlugsFree(dto.translations);
    try {
      const id = await this.db.$transaction(async (tx) => {
        const row = await this.articles.createWithTranslations({
          categoryId: dto.categoryId,
          authorId: dto.authorId ?? null,
          coverMediaId: dto.coverMediaId ?? null,
          createdById: userId,
          translations: dto.translations,
        }, tx);
        const after = await this.articles.findByIdFull(row.id, tx);
        if (!after) throw new NotFoundException('Article not found.');
        await this.recordHistory(tx, {
          entityId: row.id,
          actorId: userId,
          cause: 'create',
          snapshot: this.snapshotArticle(after),
          action: 'create',
        });
        return row.id;
      });
      return this.read(id);
    } catch (err) {
      throw this.asSlugConflict(err);
    }
  }

  async update(id: string, dto: UpdateArticleDto, userId: string) {
    const existing = await this.articles.findByIdFull(id);
    if (!existing) throw new NotFoundException('Article not found.');
    const targetStatus = this.resolvePatchStatus(existing.status, dto.status);
    if (dto.categoryId !== undefined && !(await this.categories.exists(dto.categoryId))) {
      throw new NotFoundException('Category not found.');
    }
    if (dto.authorId !== undefined && dto.authorId !== null && !(await this.authors.exists(dto.authorId))) {
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
            await this.articles.upsertTranslation(id, t, tx);
          } catch (err) {
            throw this.asSlugConflict(err);
          }
        }
        await this.articles.updateFields(id, {
          categoryId: dto.categoryId,
          authorId: dto.authorId,
          coverMediaId: dto.coverMediaId,
          status: targetStatus,
          isBreaking: dto.isBreaking,
          isFeatured: dto.isFeatured,
          updatedById: userId,
        }, tx);
        const after = await this.articles.findByIdFull(id, tx);
        if (!after?.translations.some((t) => t.locale === DEFAULT_LOCALE)) {
          throw new UnprocessableEntityException('Spanish translation is required.');
        }
        await this.recordHistory(tx, {
          entityId: id,
          actorId: userId,
          cause: 'edit',
          snapshot: this.snapshotArticle(after),
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
    const existing = await this.articles.findByIdFull(id);
    if (!existing) throw new NotFoundException('Article not found.');
    await this.db.$transaction(async (tx) => {
      await this.articles.deleteById(id, tx);
      await this.audit.record({
        action: 'delete',
        entityType: 'article',
        entityId: id,
        actorId: userId ?? existing.updatedById,
        metadata: { status: existing.status, snapshot: this.snapshotArticle(existing) },
      }, tx);
    });
  }

  /**
   * Publishing transitions (F4). `firstPublishedAt` is set once on the first
   * publish and never rewritten; unpublish keeps history; audit tracks the actor.
   */
  async transition(id: string, action: TransitionAction, userId: string, opts?: { reason?: string }) {
    const row = await this.articles.findByIdFull(id);
    if (!row) throw new NotFoundException('Article not found.');
    const target = resolveTransition(row.status, action);
    if (target === null) return this.read(id);
    if (action === 'publish' && !row.translations.some((t) => t.locale === DEFAULT_LOCALE)) {
      throw new UnprocessableEntityException('Spanish translation is required to publish.');
    }
    const reason = opts?.reason?.trim() ? opts.reason.trim().slice(0, 500) : undefined;
    const beforeStatus = row.status;
    await this.db.$transaction(async (tx) => {
      await this.articles.setStatus(id, {
        status: target,
        publishedAt: action === 'publish' && !row.publishedAt ? new Date() : undefined,
        // Any explicit transition leaves review: a pending schedule is cancelled.
        scheduledAt: null,
        scheduledById: null,
        updatedById: userId,
      }, tx);
      const after = await this.articles.findByIdFull(id, tx);
      if (!after) throw new NotFoundException('Article not found.');
      await this.recordHistory(tx, {
        entityId: id,
        actorId: userId,
        cause: `transition:${action}`,
        snapshot: this.snapshotArticle(after),
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
    const row = await this.articles.findByIdFull(id);
    if (!row) throw new NotFoundException('Article not found.');
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
      await this.articles.setSchedule(id, { scheduledAt: at, scheduledById: userId, updatedById: userId }, tx);
      const after = await this.articles.findByIdFull(id, tx);
      if (!after) throw new NotFoundException('Article not found.');
      await this.recordHistory(tx, {
        entityId: id,
        actorId: userId,
        cause: 'schedule.set',
        snapshot: this.snapshotArticle(after),
        action: 'schedule.set',
        metadata: { scheduledAt: at.toISOString() },
      });
    });
    return this.read(id);
  }

  async unschedule(id: string, userId: string) {
    const row = await this.articles.findByIdFull(id);
    if (!row) throw new NotFoundException('Article not found.');
    if (row.scheduledAt === null) return this.read(id);
    await this.db.$transaction(async (tx) => {
      await this.articles.clearSchedule(id, userId, tx);
      const after = await this.articles.findByIdFull(id, tx);
      if (!after) throw new NotFoundException('Article not found.');
      await this.recordHistory(tx, {
        entityId: id,
        actorId: userId,
        cause: 'schedule.clear',
        snapshot: this.snapshotArticle(after),
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
    const revision = await this.revisions.get('article', id, version);
    if (!revision) throw new NotFoundException('Revision not found.');
    const row = await this.articles.findByIdFull(id);
    if (!row) throw new NotFoundException('Article not found.');
    if (row.status === 'published') {
      throw new ConflictException({
        code: 'invalid_transition',
        error: 'Conflict',
        message: `Cannot restore a published article. Unpublish it first.`,
      });
    }
    const snap = revision.snapshot as unknown as RevisionSnapshot;
    await this.db.$transaction(async (tx) => {
      const current = await this.articles.findByIdFull(id, tx);
      if (!current) throw new NotFoundException('Article not found.');
      if (current.status === 'published') {
        throw new ConflictException({
          code: 'invalid_transition',
          error: 'Conflict',
          message: `Cannot restore a published article. Unpublish it first.`,
        });
      }
      for (const t of snap.translations) {
        await this.articles.upsertTranslation(id, {
          locale: t.locale,
          slug: t.slug,
          title: t.title,
          summary: t.summary,
          coverAlt: t.coverAlt,
          content: Array.isArray(t.content) ? t.content.filter((p): p is string => typeof p === 'string') : [],
        }, tx);
      }
      await this.articles.updateFields(id, {
        categoryId: snap.categoryId ?? undefined,
        authorId: snap.authorId === null ? null : (snap.authorId ?? undefined),
        coverMediaId: snap.coverMediaId === null ? null : (snap.coverMediaId ?? undefined),
        isBreaking: snap.isBreaking,
        isFeatured: snap.isFeatured,
        updatedById: userId,
      }, tx);
      const after = await this.articles.findByIdFull(id, tx);
      if (!after?.translations.some((t) => t.locale === DEFAULT_LOCALE)) {
        throw new UnprocessableEntityException('Spanish translation is required.');
      }
      await this.recordHistory(tx, {
        entityId: id,
        actorId: userId,
        cause: 'restore',
        snapshot: this.snapshotArticle(after),
        action: 'revision.restore',
        metadata: { restoredVersion: version },
      });
    });
    return this.read(id);
  }

  async listRevisions(id: string, page?: number, limit?: number) {
    const row = await this.articles.findByIdFull(id);
    if (!row) throw new NotFoundException('Article not found.');
    return this.revisions.list('article', id, page, limit);
  }

  async getRevision(id: string, version: number) {
    const row = await this.articles.findByIdFull(id);
    if (!row) throw new NotFoundException('Article not found.');
    const revision = await this.revisions.get('article', id, version);
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
    const due = await this.articles.findDue(now, take);
    const published: string[] = [];
    const failed: Array<{ id: string; code: string }> = [];
    for (const row of due) {
      try {
        const outcome: 'claimed' | 'skipped' | 'failed:unprocessable' = await this.db.$transaction(async (tx) => {
          const full = await this.articles.findByIdFull(row.id, tx);
          if (!full || full.status !== 'review' || !full.scheduledAt || full.scheduledAt > now) return 'skipped';
          if (!full.translations.some((t) => t.locale === DEFAULT_LOCALE)) return 'failed:unprocessable';
          const actor = full.scheduledById ?? full.updatedById ?? undefined;
          const claimed = await this.articles.publishDue(
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
            snapshot: this.snapshotArticle(full, { status: 'published', publishedAt, scheduledAt: null }),
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
   * Bulk actions (Increment 1). Each id runs isolated: its transition/delete
   * either succeeds or yields a per-item `{ ok: false, code }` entry.
   * One id's failure never reverts the others (no wrapping transaction).
   * Batches over BULK_MAX_IDS are rejected with 422; empty arrays fail
   * DTO validation with 400 before reaching here.
   */
  async bulk(action: BulkAction, ids: string[], userId: string): Promise<{ results: BulkItemResult[] }> {
    if (ids.length > BULK_MAX_IDS) {
      throw new UnprocessableEntityException(`A maximum of ${BULK_MAX_IDS} ids per bulk request.`);
    }
    const results: BulkItemResult[] = [];
    for (const id of ids) {
      try {
        if (action === 'delete') {
          await this.remove(id, userId);
        } else {
          await this.transition(id, action satisfies TransitionAction, userId);
        }
        results.push({ id, ok: true });
      } catch (err) {
        const code = toBulkCode(err);
        results.push({ id, ok: false, code });
        // Per-item failure audit (precision: never rolls back the rest).
        // Best-effort: the item itself is unchanged, only its audit row
        // could be lost, and that must not fail the bulk response.
        try {
          await this.audit.record({
            action,
            entityType: 'article',
            entityId: id,
            actorId: userId,
            metadata: { ok: false, code, bulk: true },
          });
        } catch (auditErr) {
          this.logger.warn(`bulk audit failed for ${id}: ${auditErr instanceof Error ? auditErr.message : auditErr}`);
        }
      }
    }
    return { results };
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

  private async assertReferences(categoryId: string, authorId?: string | null, coverMediaId?: string | null) {
    if (!(await this.categories.exists(categoryId))) {
      throw new NotFoundException('Category not found.');
    }
    if (authorId && !(await this.authors.exists(authorId))) {
      throw new NotFoundException('Author not found.');
    }
    if (coverMediaId && !(await this.media.findById(coverMediaId))) {
      throw new NotFoundException('Media asset not found.');
    }
  }

  private async assertSlugsFree(
    translations: Array<{ locale: string; slug: string }>,
    excludeArticleId?: string,
  ) {
    for (const t of translations) {
      const hit = await this.articles.findTranslationBySlug(t.locale, t.slug);
      if (hit && hit.articleId !== excludeArticleId) {
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
    query: { page?: number; limit?: number; status?: string; category?: string; author?: string; q?: string; breaking?: boolean; featured?: boolean; scheduled?: boolean; overdue?: boolean },
    locale: ResolvedLocale,
  ) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    const filters = await this.resolveFilters(query, locale);
    const total = await this.articles.countAny({ ...filters, status: query.status });
    const rows = await this.articles.listAny({ ...filters, status: query.status }, (page - 1) * limit, limit);
    const data = await Promise.all(
      rows.map(async (row) => ({ ...(await this.toListItem(row, locale)), status: row.status as string })),
    );
    const versions = await this.revisions.latestVersions(
      'article',
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
    const row = await this.articles.findByIdFull(id);
    if (!row) throw new NotFoundException('Article not found.');
    const version = await this.revisions.latestVersion('article', id);
    return {
      id: row.id,
      version,
      categoryId: row.categoryId,
      authorId: row.authorId,
      coverMediaId: row.coverMediaId,
      status: row.status,
      isBreaking: row.isBreaking,
      isFeatured: row.isFeatured,
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
