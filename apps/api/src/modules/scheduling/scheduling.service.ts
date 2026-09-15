import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ArticlesService } from '../articles/articles.service';
import { OpinionsService } from '../opinions/opinions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlanningService } from '../planning/planning.service';
import { SyndicationService } from '../syndication/syndication.service';

/**
 * Due-schedule executor (Increment 5). Polls every minute for review items
 * whose scheduledAt passed and publishes each through the guarded claim
 * path (multi-instance safe, idempotent). Items failing validation keep
 * their schedule for the next tick and surface as overdue in the Scheduled
 * view; failures are logged here as the `schedule.failed` hook point for
 * Inc 7 notifications (no event infra in Inc 5 by design).
 */
@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    @Inject(ArticlesService) private readonly articles: ArticlesService,
    @Inject(OpinionsService) private readonly opinions: OpinionsService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(PlanningService) private readonly planning: PlanningService,
    @Inject(SyndicationService) private readonly syndication: SyndicationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(now: Date = new Date()) {
    const articles = await this.articles.publishDue(now).catch((err: unknown) => {
      this.logger.error(`schedule.tick articles failed: ${err instanceof Error ? err.message : err}`);
      return { published: [], failed: [] };
    });
    const opinions = await this.opinions.publishDue(now).catch((err: unknown) => {
      this.logger.error(`schedule.tick opinions failed: ${err instanceof Error ? err.message : err}`);
      return { published: [], failed: [] };
    });
    for (const id of articles.published) {
      this.logger.log(`schedule.publish article ${id}`);
      void this.notifications.emit({ type: 'schedule.executed', entityType: 'article', entityId: id });
    }
    for (const id of opinions.published) {
      this.logger.log(`schedule.publish opinion ${id}`);
      void this.notifications.emit({ type: 'schedule.executed', entityType: 'opinion', entityId: id });
    }
    // schedule.failed: validation failures keep their schedule and retry next
    // tick; surfaced as overdue, never silent. Fan-out is best-effort.
    for (const item of articles.failed) {
      this.logger.warn(`schedule.failed ${item.id} code=${item.code}`);
      void this.notifications.emit({ type: 'schedule.failed', entityType: 'article', entityId: item.id, payload: { code: item.code } });
    }
    for (const item of opinions.failed) {
      this.logger.warn(`schedule.failed ${item.id} code=${item.code}`);
      void this.notifications.emit({ type: 'schedule.failed', entityType: 'opinion', entityId: item.id, payload: { code: item.code } });
    }
    // Planning due-scan (Increment 8): due.soon/overdue notifications, once
    // per item (audit-deduped). Best-effort; never breaks the publish tick.
    const planning = await this.planning.dueScan(now).catch((err: unknown) => {
      this.logger.error(`schedule.tick planning failed: ${err instanceof Error ? err.message : err}`);
      return { dueSoon: [], overdue: [] };
    });
    // Webhook deliveries (Increment 10): retries + purge ride the same tick.
    const webhooks = await this.syndication.processDue(now).catch((err: unknown) => {
      this.logger.error(`schedule.tick webhooks failed: ${err instanceof Error ? err.message : err}`);
      return { delivered: [], retried: [], failed: [] };
    });
    return { articles, opinions, planning, webhooks };
  }
}
