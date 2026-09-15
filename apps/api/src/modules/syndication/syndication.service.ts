import { createHmac, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../history/audit.service';
import { hashToken, newRefreshToken } from '../auth/tokens';
import { buildMeta, normalizePagination } from '../../common/pagination';
import { SyndicationRepository } from './syndication.repository';
import type { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';

export const WEBHOOK_RETRY_MS = [60_000, 300_000, 900_000];
export const WEBHOOK_TIMEOUT_MS = 5000;
export const WEBHOOK_MAX_ATTEMPTS = 3;
export const DELIVERY_RETENTION_DAYS = 30;

export interface WebhookPayload {
  event: 'published' | 'unpublished';
  entityType: 'article' | 'opinion';
  entityId: string;
  title: string;
  slug: string;
  summary?: string;
  categorySlug?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  unpublishedAt?: string | null;
  sentAt: string;
}

/** HMAC-SHA256 over the raw body; hex, `sha256=` prefixed per contract. */
export function webhookSignature(secretHex: string, rawBody: string): string {
  return `sha256=${createHmac('sha256', Buffer.from(secretHex, 'hex')).update(rawBody, 'utf8').digest('hex')}`;
}

export function verifyWebhookSignature(secretHex: string, rawBody: string, signature: string): boolean {
  const expected = Buffer.from(webhookSignature(secretHex, rawBody), 'utf8');
  const actual = Buffer.from(signature, 'utf8');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

@Injectable()
export class SyndicationService {
  private readonly logger = new Logger(SyndicationService.name);

  constructor(
    @Inject(SyndicationRepository) private readonly webhooks: SyndicationRepository,
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ---- RSS (public, read-only, published-only) ----

  private async publishedForFeed(categorySlug?: string) {
    const articles = await this.db.article.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      include: {
        translations: true,
        category: { include: { translations: true } },
        author: { include: { translations: true } },
      },
    });
    const opinions = categorySlug
      ? []
      : await this.db.opinion.findMany({
          where: { status: 'published' },
          orderBy: { publishedAt: 'desc' },
          take: 50,
          include: { translations: true, author: { include: { translations: true } } },
        });
    const esOf = (translations: Array<{ locale: string; slug: string; title: string; summary: string }>) =>
      translations.find((t) => t.locale === 'es');
    const rows: Array<{
      title: string;
      link: string;
      summary: string;
      publishedAt: Date | null;
      categorySlug: string | null;
      authorName: string | null;
    }> = [];
    for (const a of articles) {
      const t = esOf(a.translations);
      if (!t) continue;
      const cat = a.category.translations.find((c) => c.locale === 'es') ?? a.category.translations[0];
      if (categorySlug && cat?.slug !== categorySlug) continue;
      rows.push({
        title: t.title,
        link: `/news/${cat?.slug ?? 'general'}/${t.slug}`,
        summary: t.summary,
        publishedAt: a.publishedAt,
        categorySlug: cat?.slug ?? null,
        authorName: a.author?.translations.find((x) => x.locale === 'es')?.name ?? null,
      });
    }
    for (const o of opinions) {
      const t = esOf(o.translations);
      if (!t) continue;
      rows.push({
        title: t.title,
        link: `/opiniones/${t.slug}`,
        summary: t.summary,
        publishedAt: o.publishedAt,
        categorySlug: null,
        authorName: o.author.translations.find((x) => x.locale === 'es')?.name ?? null,
      });
    }
    return rows
      .filter((r) => r.publishedAt)
      .sort((a, b) => (b.publishedAt as Date).getTime() - (a.publishedAt as Date).getTime())
      .slice(0, 50);
  }

  async feedXml(categorySlug?: string): Promise<{ xml: string; empty: boolean }> {
    if (categorySlug) {
      const exists = await this.db.categoryTranslation.findFirst({ where: { slug: categorySlug } });
      if (!exists) return { xml: '', empty: true };
    }
    const rows = await this.publishedForFeed(categorySlug);
    const items = rows
      .map(
        (r) => `    <item>
      <title>${escapeXml(r.title)}</title>
      <link>${escapeXml(r.link)}</link>
      <guid isPermaLink="false">${escapeXml(r.link)}</guid>
      <description>${escapeXml(r.summary)}</description>
      <pubDate>${(r.publishedAt as Date).toUTCString()}</pubDate>
    </item>`,
      )
      .join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Newshub${categorySlug ? ` - ${escapeXml(categorySlug)}` : ''}</title>\n    <link>/</link>\n    <description>Newshub editorial feed</description>\n${items}\n  </channel>\n</rss>`;
    return { xml, empty: false };
  }

  // ---- Webhook subscriptions (admin) ----

  /** https only; http permitted solely for loopback (dev/test receivers). */
  private requirePublicUrl(raw: string): void {
    const u = new URL(raw);
    if (u.protocol === 'https:') return;
    if (u.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(u.hostname)) return;
    throw new UnprocessableEntityException('Only https URLs are allowed (http permitted for loopback only).');
  }

  async createSubscription(dto: CreateWebhookDto, userId: string) {
    this.requirePublicUrl(dto.url);
    const secret = newRefreshToken();
    const row = await this.db.$transaction(async (tx) => {
      const created = await this.webhooks.createSubscription(
        {
          url: dto.url,
          secretHash: hashToken(secret),
          events: dto.events?.length ? [...new Set(dto.events)] : ['published', 'unpublished'],
          createdById: userId,
        },
        tx,
      );
      await this.audit.record(
        { action: 'webhook.subscribe', entityType: 'webhook', entityId: created.id, actorId: userId },
        tx,
      );
      return created;
    });
    // Secret visible exactly once; never persisted in clear.
    return { ...row, secret };
  }

  listSubscriptions() {
    return this.webhooks.listSubscriptions();
  }

  async updateSubscription(id: string, dto: UpdateWebhookDto, userId: string) {
    const existing = await this.webhooks.findSubscription(id);
    if (!existing) throw new NotFoundException('Webhook not found.');
    if (dto.url !== undefined) this.requirePublicUrl(dto.url);
    const row = await this.db.$transaction(async (tx) => {
      const updated = await this.webhooks.updateSubscription(
        id,
        {
          ...(dto.url !== undefined ? { url: dto.url } : {}),
          ...(dto.events !== undefined ? { events: [...new Set(dto.events)] } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
        tx,
      );
      await this.audit.record(
        { action: 'webhook.update', entityType: 'webhook', entityId: id, actorId: userId },
        tx,
      );
      return updated;
    });
    return row;
  }

  async rotateSecret(id: string, userId: string) {
    const existing = await this.webhooks.findSubscription(id);
    if (!existing) throw new NotFoundException('Webhook not found.');
    const secret = newRefreshToken();
    const row = await this.db.$transaction(async (tx) => {
      const updated = await this.webhooks.rotateSecret(id, hashToken(secret), tx);
      // Audit metadata never carries the secret.
      await this.audit.record(
        { action: 'webhook.rotate', entityType: 'webhook', entityId: id, actorId: userId },
        tx,
      );
      return updated;
    });
    return { ...row, secret };
  }

  async removeSubscription(id: string, userId: string): Promise<void> {
    const existing = await this.webhooks.findSubscription(id);
    if (!existing) throw new NotFoundException('Webhook not found.');
    await this.db.$transaction(async (tx) => {
      await this.webhooks.deleteSubscription(id, tx);
      await this.audit.record(
        { action: 'webhook.unsubscribe', entityType: 'webhook', entityId: id, actorId: userId },
        tx,
      );
    });
  }

  async listDeliveries(id: string, page?: number, limit?: number) {
    const existing = await this.webhooks.findSubscription(id);
    if (!existing) throw new NotFoundException('Webhook not found.');
    const { page: p, limit: l } = normalizePagination(page, limit);
    const [total, rows] = await Promise.all([
      this.webhooks.countDeliveries(id),
      this.webhooks.listDeliveries(id, (p - 1) * l, l),
    ]);
    return { data: rows, meta: buildMeta(p, l, total) };
  }

  // ---- Fan-out enqueue (called post-commit by content transitions) ----

  /**
   * Best-effort by design (void at call sites): enqueue one delivery per
   * active subscription listening to the action. Never throws.
   */
  async fanout(
    entityType: 'article' | 'opinion',
    entityId: string,
    action: 'published' | 'unpublished',
    payload: Omit<WebhookPayload, 'event' | 'entityType' | 'entityId' | 'sentAt'>,
  ): Promise<void> {
    try {
      const subs = await this.webhooks.activeSubscriptions();
      const body: WebhookPayload = {
        event: action,
        entityType,
        entityId,
        ...payload,
        sentAt: new Date().toISOString(),
      };
      for (const sub of subs) {
        if (!sub.events.includes(action)) continue;
        await this.webhooks.enqueue({
          subscriptionId: sub.id,
          entityType,
          entityId,
          action,
          payload: body as unknown as Record<string, unknown>,
        });
      }
    } catch (err) {
      this.logger.warn(`webhook fan-out dropped (${entityType}/${action}): ${err instanceof Error ? err.message : err}`);
    }
  }

  // ---- Delivery worker (driven by the scheduling tick, no new cron) ----

  private async attempt(
    subscription: { id: string; url: string; secretHash: string },
    delivery: { id: string; payload: unknown },
  ): Promise<{ ok: true; responseCode: number } | { ok: false; responseCode: number | null; error: string }> {
    // Key agreement: only sha256(secret) is stored (irreversible). Receivers
    // hash the once-displayed secret themselves and HMAC with that digest,
    // so both sides sign with the identical key. `sha256=<hmac>` over raw body.
    const sentAt = new Date().toISOString();
    const withSentAt = JSON.stringify({ ...(delivery.payload as Record<string, unknown>), sentAt });
    const payload = delivery.payload as { event?: string };
    const signature = webhookSignature(subscription.secretHash, withSentAt);
    try {
      const res = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Newshub-Signature': signature,
          'X-Newshub-Event': payload.event ?? 'unknown',
          'X-Newshub-Delivery': delivery.id,
          'X-Newshub-Timestamp': sentAt,
        },
        body: withSentAt,
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      if (res.status >= 200 && res.status < 300) return { ok: true, responseCode: res.status };
      return { ok: false, responseCode: res.status, error: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, responseCode: null, error: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200) };
    }
  }

  async processDue(now: Date = new Date()): Promise<{ delivered: string[]; retried: string[]; failed: string[] }> {
    const delivered: string[] = [];
    const retried: string[] = [];
    const failed: string[] = [];
    try {
      const due = await this.webhooks.dueDeliveries(now);
      for (const row of due) {
        const claimed = await this.webhooks.claim(row.id, now);
        if (claimed.count === 0) continue;
        const sub = await this.webhooks.findSubscription(row.subscriptionId);
        if (!sub || !sub.active) {
          await this.webhooks.settle(row.id, { ok: false, responseCode: null, error: 'subscription inactive', nextAttemptAt: null });
          failed.push(row.id);
          continue;
        }
        const result = await this.attempt(sub, row as unknown as { id: string; payload: unknown });
        if (result.ok) {
          await this.webhooks.settle(row.id, { ok: true, responseCode: result.responseCode });
          delivered.push(row.id);
          continue;
        }
        const attempts = (row as unknown as { attempts: number }).attempts;
        const next = attempts >= WEBHOOK_MAX_ATTEMPTS - 1 ? null : new Date(now.getTime() + WEBHOOK_RETRY_MS[attempts]);
        await this.webhooks.settle(row.id, { ok: false, responseCode: result.responseCode, error: result.error, nextAttemptAt: next });
        (next ? retried : failed).push(row.id);
      }
      await this.webhooks.purgeDeliveries(new Date(now.getTime() - DELIVERY_RETENTION_DAYS * 24 * 3600_000));
    } catch (err) {
      this.logger.warn(`webhook processDue dropped: ${err instanceof Error ? err.message : err}`);
    }
    return { delivered, retried, failed };
  }

  /** Immediate test ping (not persisted as a delivery; audited). */
  async ping(id: string, userId: string) {
    const sub = await this.webhooks.findSubscription(id);
    if (!sub) throw new NotFoundException('Webhook not found.');
    const sample = { event: 'ping', subscriptionId: id, sentAt: new Date().toISOString() };
    const rawBody = JSON.stringify(sample);
    let result: { ok: boolean; responseCode: number | null; error?: string };
    try {
      const res = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Newshub-Signature': webhookSignature(sub.secretHash, rawBody),
          'X-Newshub-Event': 'ping',
          'X-Newshub-Delivery': 'ping',
          'X-Newshub-Timestamp': sample.sentAt,
        },
        body: rawBody,
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      result = res.status >= 200 && res.status < 300
        ? { ok: true, responseCode: res.status }
        : { ok: false, responseCode: res.status, error: `HTTP ${res.status}` };
    } catch (err) {
      result = { ok: false, responseCode: null, error: err instanceof Error ? err.message.slice(0, 200) : 'failed' };
    }
    await this.audit.record({ action: 'webhook.ping', entityType: 'webhook', entityId: id, actorId: userId });
    return result;
  }
}
