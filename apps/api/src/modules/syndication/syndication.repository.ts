import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DELIVERY_PUBLIC = {
  id: true,
  subscriptionId: true,
  entityType: true,
  entityId: true,
  action: true,
  status: true,
  attempts: true,
  nextAttemptAt: true,
  payload: true,
  responseCode: true,
  error: true,
  createdAt: true,
  updatedAt: true,
} as const;

const SUBSCRIPTION_PUBLIC = {
  id: true,
  url: true,
  events: true,
  active: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class SyndicationRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  createSubscription(
    input: { url: string; secretHash: string; events: string[]; createdById: string },
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).webhook.create({
      data: {
        url: input.url,
        secretHash: input.secretHash,
        events: input.events,
        createdById: input.createdById,
      },
      select: SUBSCRIPTION_PUBLIC,
    });
  }

  listSubscriptions() {
    return this.prisma.webhook.findMany({ orderBy: { createdAt: 'desc' }, select: SUBSCRIPTION_PUBLIC });
  }

  findSubscription(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).webhook.findUnique({ where: { id } });
  }

  updateSubscription(
    id: string,
    input: { url?: string; events?: string[]; active?: boolean },
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).webhook.update({
      where: { id },
      data: {
        ...(input.url !== undefined ? { url: input.url } : {}),
        ...(input.events !== undefined ? { events: input.events } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      select: SUBSCRIPTION_PUBLIC,
    });
  }

  rotateSecret(id: string, secretHash: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).webhook.update({
      where: { id },
      data: { secretHash },
      select: SUBSCRIPTION_PUBLIC,
    });
  }

  deleteSubscription(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).webhook.delete({ where: { id } });
  }

  activeSubscriptions(tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).webhook.findMany({ where: { active: true } });
  }

  /** Idempotent enqueue: unique key collapses redelivery into the same row. */
  enqueue(
    input: { subscriptionId: string; entityType: string; entityId: string; action: string; payload: Record<string, unknown> },
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).webhookDelivery.upsert({
      where: {
        subscriptionId_entityType_entityId_action: {
          subscriptionId: input.subscriptionId,
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
        },
      },
      create: {
        subscriptionId: input.subscriptionId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        payload: input.payload as Prisma.InputJsonValue,
        status: 'pending',
        nextAttemptAt: new Date(),
      },
      update: {},
      select: DELIVERY_PUBLIC,
    });
  }

  /**
   * Stale-inflight timeout (reaper): a row claimed longer ago than this is
   * assumed orphaned by a dead tick and becomes reclaimable. No migration:
   * reuses the existing claimedAt column.
   */
  static readonly INFLIGHT_TIMEOUT_MS = 300_000;

  /**
   * Atomic claim for a single delivery (multi-tick safe): flips
   * pending→inflight only if still pending and due, or inflight-but-stale
   * (reaper). Returns count 0 when another tick claimed it first — same
   * pattern as publishDue.
   */
  claim(id: string, now: Date, tx?: Prisma.TransactionClient) {
    const staleBefore = new Date(now.getTime() - SyndicationRepository.INFLIGHT_TIMEOUT_MS);
    return (tx ?? this.prisma).webhookDelivery.updateMany({
      where: {
        id,
        OR: [
          { status: 'pending', nextAttemptAt: { lte: now } },
          { status: 'inflight', claimedAt: { lt: staleBefore } },
        ],
      },
      data: { status: 'inflight', claimedAt: now },
    });
  }

  findDelivery(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).webhookDelivery.findUnique({ where: { id }, select: DELIVERY_PUBLIC });
  }

  settle(
    id: string,
    outcome:
      | { ok: true; responseCode: number }
      | { ok: false; responseCode: number | null; error: string; nextAttemptAt: Date | null },
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).webhookDelivery.update({
      where: { id },
      data: outcome.ok
        ? { status: 'delivered', responseCode: outcome.responseCode, error: null }
        : {
            status: outcome.nextAttemptAt ? 'pending' : 'failed',
            attempts: { increment: 1 },
            // nextAttemptAt is non-nullable; terminal rows keep a stale value.
            nextAttemptAt: outcome.nextAttemptAt ?? new Date(),
            responseCode: outcome.responseCode,
            error: outcome.error.slice(0, 500),
          },
      select: DELIVERY_PUBLIC,
    });
  }

  listDeliveries(subscriptionId: string, skip: number, take: number) {
    return this.prisma.webhookDelivery.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: DELIVERY_PUBLIC,
    });
  }

  countDeliveries(subscriptionId: string) {
    return this.prisma.webhookDelivery.count({ where: { subscriptionId } });
  }

  dueDeliveries(now: Date, take = 20) {
    const staleBefore = new Date(now.getTime() - SyndicationRepository.INFLIGHT_TIMEOUT_MS);
    return this.prisma.webhookDelivery.findMany({
      where: {
        OR: [
          { status: 'pending', nextAttemptAt: { lte: now } },
          { status: 'inflight', claimedAt: { lt: staleBefore } },
        ],
      },
      orderBy: { nextAttemptAt: 'asc' },
      take,
    });
  }

  purgeDeliveries(before: Date) {
    return this.prisma.webhookDelivery.deleteMany({
      where: { createdAt: { lt: before }, status: { in: ['delivered', 'failed'] } },
    });
  }
}
