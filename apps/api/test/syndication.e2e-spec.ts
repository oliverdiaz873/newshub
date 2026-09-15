import 'dotenv/config';
import { execSync } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { ProblemExceptionFilter } from '../src/common/http/problem.filter';
import { CacheControlInterceptor } from '../src/common/http/cache-control.interceptor';
import { hashPassword } from '../src/modules/auth/password';
import type { SchedulingService } from '../src/modules/scheduling/scheduling.service';

const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('TEST_DATABASE_URL is required for e2e.');

const prisma = new PrismaClient({ datasourceUrl: TEST_URL });

interface Received {
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

const esDoc = (slug: string) => ({
  locale: 'es',
  slug,
  title: `Titulo suficiente para ${slug}`,
  summary: 'Resumen suficientemente largo para la validacion.',
  content: ['Parrafo uno.'],
});

async function fixture() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "users", "authors", "categories", "articles", "opinions", "media_assets", "user_credentials", "refresh_tokens", "revisions", "audit_events", "notifications", "notification_prefs", "planning_items", "webhooks", "webhook_deliveries" RESTART IDENTITY CASCADE',
  );
  const mk = async (email: string, role: string, pass: string) => {
    const u = await prisma.user.create({ data: { email, displayName: email, role } });
    await prisma.userCredential.create({ data: { userId: u.id, passwordHash: await hashPassword(pass) } });
    return u;
  };
  const editor = await mk('editor@newshub.local', 'editor', 'Editor123!');
  await mk('reviewer@newshub.local', 'reviewer', 'Reviewer123!');
  await mk('admin@newshub.local', 'admin', 'Admin123!');
  const author = await prisma.author.create({ data: { slug: 'redaccion' } });
  await prisma.authorTranslation.create({ data: { authorId: author.id, locale: 'es', name: 'Redacción', bio: null } });
  const category = await prisma.category.create({ data: { sort: 0 } });
  await prisma.categoryTranslation.create({
    data: { categoryId: category.id, locale: 'es', slug: 'politica', label: 'Política', description: 'Desc.' },
  });
  return { editor, category };
}

describe('Increment 10 syndication (e2e)', () => {
  let app: INestApplication;
  let scheduler: SchedulingService;
  let categoryId: string;
  let server: Server;
  let port: number;
  const received: Received[] = [];
  let failMode = false;

  const tokenCache = new Map<string, string>();
  async function login(email: string, password: string): Promise<string> {
    const hit = tokenCache.get(email);
    if (hit) return hit;
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password }).expect(200);
    const bearer = `Bearer ${res.body.accessToken as string}`;
    tokenCache.set(email, bearer);
    return bearer;
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL;
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_URL },
      stdio: 'pipe',
    });
    const f = await fixture();
    categoryId = f.category.id;

    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString('utf8');
      });
      req.on('end', () => {
        received.push({ url: req.url ?? '', headers: req.headers, body });
        if (failMode) {
          res.statusCode = 500;
          res.end('boom');
        } else {
          res.statusCode = 200;
          res.end('ok');
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as { port: number }).port;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ProblemExceptionFilter());
    app.useGlobalInterceptors(new CacheControlInterceptor());
    await app.init();
    const { SchedulingService: Sched } = await import('../src/modules/scheduling/scheduling.service');
    scheduler = app.get(Sched);
  }, 120000);

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(() => {
    received.length = 0;
    failMode = false;
  });

  /** Fan-out is fire-and-forget post-commit: wait until rows exist before ticking. */
  async function waitForEnqueue(entityId: string, timeoutMs = 15000): Promise<void> {
    const start = Date.now();
    for (;;) {
      const n = await prisma.webhookDelivery.count({ where: { entityId } });
      if (n > 0) return;
      if (Date.now() - start > timeoutMs) throw new Error(`enqueue timeout for ${entityId}`);
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  async function publishArticle(auth: string, slug: string): Promise<string> {
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc(slug)] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    await request(app.getHttpServer()).post(`/api/v1/articles/${id}/publish`).set('Authorization', auth).expect(200);
    return id;
  }

  function hmacFor(displayedSecret: string, rawBody: string): string {
    const key = createHash('sha256').update(displayedSecret, 'utf8').digest();
    return `sha256=${createHmac('sha256', key).update(rawBody, 'utf8').digest('hex')}`;
  }

  it('serves public RSS excluding drafts, per category', async () => {
    const auth = await login('editor@newshub.local', 'Editor123!');
    await publishArticle(auth, 'rss-uno');
    await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('rss-borrador')] })
      .expect(201);

    const feed = await request(app.getHttpServer()).get('/api/v1/syndication/feed.xml').expect(200);
    expect(feed.headers['content-type']).toContain('application/rss+xml');
    expect(feed.text).toContain('<rss version="2.0">');
    expect(feed.text).toContain('rss-uno');
    expect(feed.text).not.toContain('rss-borrador');

    const cat = await request(app.getHttpServer()).get('/api/v1/syndication/feed/politica.xml').expect(200);
    expect(cat.text).toContain('rss-uno');
    await request(app.getHttpServer()).get('/api/v1/syndication/feed/inexistente.xml').expect(404);
  });

  it('has no API sitemap route (storefront sitemap is untouched)', async () => {
    await request(app.getHttpServer()).get('/api/v1/syndication/sitemap.xml').expect(404);
  });

  it('restricts webhook admin to admin role', async () => {
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const reviewerAuth = await login('reviewer@newshub.local', 'Reviewer123!');
    for (const auth of [editorAuth, reviewerAuth]) {
      await request(app.getHttpServer())
        .post('/api/v1/webhooks')
        .set('Authorization', auth)
        .send({ url: `http://127.0.0.1:${port}/hook` })
        .expect(403);
      await request(app.getHttpServer()).get('/api/v1/webhooks').set('Authorization', auth).expect(403);
    }
    await request(app.getHttpServer()).get('/api/v1/webhooks').expect(401);
  });

  it('requires https except for loopback receivers', async () => {
    const adminAuth = await login('admin@newshub.local', 'Admin123!');
    await request(app.getHttpServer())
      .post('/api/v1/webhooks')
      .set('Authorization', adminAuth)
      .send({ url: 'http://example.com/hook' })
      .expect(422);
  });

  it('delivers signed webhooks with valid HMAC over the raw body', async () => {
    const adminAuth = await login('admin@newshub.local', 'Admin123!');
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const created = await request(app.getHttpServer())
      .post('/api/v1/webhooks')
      .set('Authorization', adminAuth)
      .send({ url: `http://127.0.0.1:${port}/hook`, events: ['published', 'unpublished'] })
      .expect(201);
    const secret = created.body.secret as string;
    expect(typeof secret).toBe('string');

    // Secret never exposed via GET.
    const listed = await request(app.getHttpServer()).get('/api/v1/webhooks').set('Authorization', adminAuth).expect(200);
    expect(JSON.stringify(listed.body)).not.toContain(secret);

    const id = await publishArticle(editorAuth, 'rss-hook');
    await waitForEnqueue(id);
    await scheduler.tick(new Date());

    const hit = received.find((r) => r.body.includes(id));
    expect(hit).toBeDefined();
    expect(hit?.headers['x-newshub-event']).toBe('published');
    expect(hit?.headers['x-newshub-delivery']).toBeDefined();
    expect(hit?.headers['x-newshub-timestamp']).toBeDefined();
    expect(hit?.headers['x-newshub-signature']).toBe(hmacFor(secret, hit?.body ?? ''));
    const payload = JSON.parse(hit?.body ?? '{}') as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(
      ['authorName', 'categorySlug', 'entityId', 'entityType', 'event', 'publishedAt', 'sentAt', 'slug', 'summary', 'title'].sort(),
    );
  });

  it('processes concurrent ticks without double delivery', async () => {
    const adminAuth = await login('admin@newshub.local', 'Admin123!');
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    await request(app.getHttpServer())
      .post('/api/v1/webhooks')
      .set('Authorization', adminAuth)
      .send({ url: `http://127.0.0.1:${port}/hook2`, events: ['published'] })
      .expect(201);
    const id = await publishArticle(editorAuth, 'rss-race');
    await waitForEnqueue(id);
    await Promise.all([scheduler.tick(new Date()), scheduler.tick(new Date())]);
    expect(received.filter((r) => r.url === '/hook2' && r.body.includes(id)).length).toBe(1);
  });

  it('treats unpublish as idempotent tombstone and retries failures to failed', async () => {
    const adminAuth = await login('admin@newshub.local', 'Admin123!');
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const created = await request(app.getHttpServer())
      .post('/api/v1/webhooks')
      .set('Authorization', adminAuth)
      .send({ url: `http://127.0.0.1:${port}/hook3`, events: ['unpublished'] })
      .expect(201);
    const subId = created.body.id as string;
    const id = await publishArticle(editorAuth, 'rss-tumba');
    await request(app.getHttpServer()).post(`/api/v1/articles/${id}/unpublish`).set('Authorization', editorAuth).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/articles/${id}/unpublish`).set('Authorization', editorAuth).expect(200);
    await waitForEnqueue(id);
    await scheduler.tick(new Date());
    const tombstones = received.filter((r) => r.url === '/hook3' && r.body.includes(id));
    expect(tombstones.length).toBe(1);
    expect(JSON.parse(tombstones[0]?.body ?? '{}')).toMatchObject({ event: 'unpublished' });

    // Retry path: flip stub to fail, force past due, tick 3 times.
    failMode = true;
    const id2 = await publishArticle(editorAuth, 'rss-retry');
    await request(app.getHttpServer()).post(`/api/v1/articles/${id2}/unpublish`).set('Authorization', editorAuth).expect(200);
    // Wait for the tombstone row itself: earlier rows (published) appear first.
    await waitForEnqueue(id2);
    {
      const start = Date.now();
      for (;;) {
        const n = await prisma.webhookDelivery.count({
          where: { subscriptionId: subId, entityId: id2, action: 'unpublished' },
        });
        if (n > 0) break;
        if (Date.now() - start > 15000) throw new Error('tombstone enqueue timeout');
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    for (let i = 0; i < 3; i++) {
      await prisma.webhookDelivery.updateMany({
        where: { subscriptionId: subId, entityId: id2 },
        data: { nextAttemptAt: new Date(Date.now() - 1000) },
      });
      await scheduler.tick(new Date());
    }
    const rows = await prisma.webhookDelivery.findMany({ where: { subscriptionId: subId, entityId: id2 } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('failed');
    expect(rows[0]?.attempts).toBe(3);
    // Terminal: further ticks do not retry.
    const before = received.length;
    await scheduler.tick(new Date());
    expect(received.length).toBe(before);
  });

  it('reaps stale inflight deliveries but leaves fresh claims alone', async () => {
    const adminAuth = await login('admin@newshub.local', 'Admin123!');
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const reapSub = await request(app.getHttpServer())
      .post('/api/v1/webhooks')
      .set('Authorization', adminAuth)
      .send({ url: `http://127.0.0.1:${port}/hook-reap`, events: ['published'] })
      .expect(201);
    const reapSubId = reapSub.body.id as string;

    // Orphaned claim (claimed 10 min ago): reprocessed and delivered.
    const staleId = await publishArticle(editorAuth, 'rss-reap-viejo');
    await waitForEnqueue(staleId);
    const staleWhere = { subscriptionId: reapSubId, entityType: 'article', entityId: staleId, action: 'published' };
    {
      const start = Date.now();
      for (;;) {
        if (await prisma.webhookDelivery.count({ where: staleWhere })) break;
        if (Date.now() - start > 15000) throw new Error('reap row enqueue timeout');
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    const staleRow = await prisma.webhookDelivery.findFirstOrThrow({ where: staleWhere });
    await prisma.webhookDelivery.update({
      where: { id: staleRow.id },
      data: { status: 'inflight', claimedAt: new Date(Date.now() - 600_000) },
    });
    await scheduler.tick(new Date());
    const reaped = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: staleRow.id } });
    expect(reaped.status).toBe('delivered');
    expect(received.filter((r) => r.url === '/hook-reap' && r.body.includes(staleId)).length).toBe(1);

    // Fresh claim: left alone by the tick.
    const freshId = await publishArticle(editorAuth, 'rss-reap-fresco');
    await waitForEnqueue(freshId);
    const freshWhere = { subscriptionId: reapSubId, entityType: 'article', entityId: freshId, action: 'published' };
    {
      const start = Date.now();
      for (;;) {
        if (await prisma.webhookDelivery.count({ where: freshWhere })) break;
        if (Date.now() - start > 15000) throw new Error('reap row enqueue timeout');
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    const freshRow = await prisma.webhookDelivery.findFirstOrThrow({ where: freshWhere });
    await prisma.webhookDelivery.update({
      where: { id: freshRow.id },
      data: { status: 'inflight', claimedAt: new Date() },
    });
    const before = received.filter((r) => r.url === '/hook-reap').length;
    await scheduler.tick(new Date());
    expect(received.filter((r) => r.url === '/hook-reap').length).toBe(before);
    const untouched = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: freshRow.id } });
    expect(untouched.status).toBe('inflight');
  });

  it('rotation invalidates the old secret and audits without secrets', async () => {
    const adminAuth = await login('admin@newshub.local', 'Admin123!');
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const created = await request(app.getHttpServer())
      .post('/api/v1/webhooks')
      .set('Authorization', adminAuth)
      .send({ url: `http://127.0.0.1:${port}/hook4`, events: ['published'] })
      .expect(201);
    const oldSecret = created.body.secret as string;
    const subId = created.body.id as string;
    const rotated = await request(app.getHttpServer())
      .post(`/api/v1/webhooks/${subId}/rotate`)
      .set('Authorization', adminAuth)
      .expect(200);
    const newSecret = rotated.body.secret as string;
    expect(newSecret).toBeDefined();
    expect(newSecret).not.toBe(oldSecret);

    const id = await publishArticle(editorAuth, 'rss-rotado');
    await waitForEnqueue(id);
    await scheduler.tick(new Date());
    const hit = received.find((r) => r.url === '/hook4' && r.body.includes(id));
    expect(hit?.headers['x-newshub-signature']).toBe(hmacFor(newSecret, hit?.body ?? ''));
    expect(hit?.headers['x-newshub-signature']).not.toBe(hmacFor(oldSecret, hit?.body ?? ''));

    const trail = await request(app.getHttpServer())
      .get(`/api/v1/audit-log/webhook/${subId}`)
      .set('Authorization', adminAuth)
      .expect(200);
    const actions = (trail.body.data as Array<{ action: string }>).map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(['webhook.subscribe', 'webhook.rotate']));
    expect(JSON.stringify(trail.body)).not.toContain(oldSecret);
    expect(JSON.stringify(trail.body)).not.toContain(newSecret);

    // Ping works and is audited.
    failMode = false;
    const ping = await request(app.getHttpServer())
      .post(`/api/v1/webhooks/${subId}/ping`)
      .set('Authorization', adminAuth)
      .expect(200);
    expect(ping.body.ok).toBe(true);
  });
});
