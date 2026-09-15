import { SchedulingService } from './scheduling.service';

function serviceDouble(result: { published: string[]; failed: Array<{ id: string; code: string }> } | Error) {
  return {
    publishDue: jest.fn().mockImplementation(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
  };
}

function notificationsDouble() {
  return { emit: jest.fn().mockResolvedValue(undefined) };
}

function planningDouble() {
  return { dueScan: jest.fn().mockResolvedValue({ dueSoon: [], overdue: [] }) };
}

function syndicationDouble() {
  return { processDue: jest.fn().mockResolvedValue({ delivered: [], retried: [], failed: [] }) };
}

describe('SchedulingService.tick', () => {
  it('publishes due items from both surfaces and returns results', async () => {
    const articles = serviceDouble({ published: ['a1'], failed: [] });
    const opinions = serviceDouble({ published: [], failed: [{ id: 'o1', code: 'unprocessable' }] });
    const notifications = notificationsDouble();
    const planning = planningDouble();
    const syndication = syndicationDouble();
    const service = new SchedulingService(
      articles as unknown as import('../articles/articles.service').ArticlesService,
      opinions as unknown as import('../opinions/opinions.service').OpinionsService,
      notifications as unknown as import('../notifications/notifications.service').NotificationsService,
      planning as unknown as import('../planning/planning.service').PlanningService,
      syndication as unknown as import('../syndication/syndication.service').SyndicationService,
    );
    const now = new Date('2026-09-13T12:00:00.000Z');
    const out = await service.tick(now);
    expect(articles.publishDue).toHaveBeenCalledWith(now);
    expect(opinions.publishDue).toHaveBeenCalledWith(now);
    expect(out).toEqual({
      articles: { published: ['a1'], failed: [] },
      opinions: { published: [], failed: [{ id: 'o1', code: 'unprocessable' }] },
      planning: { dueSoon: [], overdue: [] },
      webhooks: { delivered: [], retried: [], failed: [] },
    });
    expect(planning.dueScan).toHaveBeenCalledWith(now);
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'schedule.executed', entityType: 'article', entityId: 'a1' }),
    );
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'schedule.failed', entityType: 'opinion', entityId: 'o1' }),
    );
  });

  it('isolates a failing surface so the other still executes', async () => {
    const articles = serviceDouble(new Error('db down'));
    const opinions = serviceDouble({ published: ['o2'], failed: [] });
    const notifications = notificationsDouble();
    const planning = planningDouble();
    const syndication = syndicationDouble();
    const service = new SchedulingService(
      articles as unknown as import('../articles/articles.service').ArticlesService,
      opinions as unknown as import('../opinions/opinions.service').OpinionsService,
      notifications as unknown as import('../notifications/notifications.service').NotificationsService,
      planning as unknown as import('../planning/planning.service').PlanningService,
      syndication as unknown as import('../syndication/syndication.service').SyndicationService,
    );
    const out = await service.tick(new Date());
    expect(out.articles).toEqual({ published: [], failed: [] });
    expect(out.opinions).toEqual({ published: ['o2'], failed: [] });
  });
});
