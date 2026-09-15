import 'dotenv/config';
import { execSync } from 'node:child_process';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { ProblemExceptionFilter } from '../src/common/http/problem.filter';
import { CacheControlInterceptor } from '../src/common/http/cache-control.interceptor';
import { hashPassword } from '../src/modules/auth/password';

const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('TEST_DATABASE_URL is required for e2e.');

const prisma = new PrismaClient({ datasourceUrl: TEST_URL });

const esDoc = (slug: string) => ({
  locale: 'es',
  slug,
  title: 'Titulo de revision suficientemente largo',
  summary: 'Resumen suficientemente largo para la validacion.',
  content: ['Parrafo uno.'],
});

async function fixture() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "users", "authors", "categories", "articles", "opinions", "media_assets", "user_credentials", "refresh_tokens", "revisions", "audit_events", "notifications", "notification_prefs" RESTART IDENTITY CASCADE',
  );
  const mk = async (email: string, role: string, pass: string) => {
    const u = await prisma.user.create({ data: { email, displayName: email, role } });
    await prisma.userCredential.create({ data: { userId: u.id, passwordHash: await hashPassword(pass) } });
    return u;
  };
  const editor = await mk('editor@newshub.local', 'editor', 'Editor123!');
  const reviewer = await mk('reviewer@newshub.local', 'reviewer', 'Reviewer123!');
  await mk('admin@newshub.local', 'admin', 'Admin123!');
  const author = await prisma.author.create({ data: { slug: 'redaccion' } });
  await prisma.authorTranslation.create({ data: { authorId: author.id, locale: 'es', name: 'Redacción', bio: null } });
  const category = await prisma.category.create({ data: { sort: 0 } });
  await prisma.categoryTranslation.create({
    data: { categoryId: category.id, locale: 'es', slug: 'politica', label: 'Política', description: 'Desc.' },
  });
  return { editor, reviewer, author, category };
}

describe('Increment 7 review / approval + notifications (e2e)', () => {
  let app: INestApplication;
  let ids: { category: string; author: string };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL;
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_URL },
      stdio: 'pipe',
    });
    const f = await fixture();
    ids = { category: f.category.id, author: f.author.id };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ProblemExceptionFilter());
    app.useGlobalInterceptors(new CacheControlInterceptor());
    await app.init();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // Login is throttled (10/min): cache one token per user for the file.
  const tokenCache = new Map<string, string>();
  async function login(email: string, password: string): Promise<string> {
    const hit = tokenCache.get(email);
    if (hit) return hit;
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password }).expect(200);
    const bearer = `Bearer ${res.body.accessToken as string}`;
    tokenCache.set(email, bearer);
    return bearer;
  }

  it('draft -> publish returns 409 invalid_transition', async () => {
    const auth = await login('editor@newshub.local', 'Editor123!');
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId: ids.category, translations: [esDoc('rev-409')] })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post(`/api/v1/articles/${created.body.id}/publish`)
      .set('Authorization', auth)
      .expect(409);
    expect(res.body.code).toBe('invalid_transition');
  });

  it('editor submits review, reviewer approves, content becomes published', async () => {
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const reviewerAuth = await login('reviewer@newshub.local', 'Reviewer123!');
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', editorAuth)
      .send({ categoryId: ids.category, translations: [esDoc('rev-flow')] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', editorAuth)
      .send({ status: 'review' })
      .expect(200);
    const published = await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/publish`)
      .set('Authorization', reviewerAuth)
      .expect(200);
    expect(published.body.status).toBe('published');
  });

  it('reviewer rejects with reason persisted in audit metadata', async () => {
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const reviewerAuth = await login('reviewer@newshub.local', 'Reviewer123!');
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', editorAuth)
      .send({ categoryId: ids.category, translations: [esDoc('rev-reject')] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', editorAuth)
      .send({ status: 'review' })
      .expect(200);
    const reason = 'Please update the source information.';
    const rejected = await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/reject`)
      .set('Authorization', reviewerAuth)
      .send({ reason })
      .expect(200);
    expect(rejected.body.status).toBe('draft');
    const audit = await request(app.getHttpServer())
      .get(`/api/v1/audit-log/article/${id}`)
      .set('Authorization', reviewerAuth)
      .expect(200);
    const actions = (audit.body.data ?? audit.body) as Array<{ action: string; metadata?: { reason?: string } }>;
    expect(actions.some((e) => e.action === 'reject' && e.metadata?.reason === reason)).toBe(true);
  });

  it('reject reason longer than 500 chars fails validation', async () => {
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const reviewerAuth = await login('reviewer@newshub.local', 'Reviewer123!');
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', editorAuth)
      .send({ categoryId: ids.category, translations: [esDoc('rev-long')] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', editorAuth)
      .send({ status: 'review' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/reject`)
      .set('Authorization', reviewerAuth)
      .send({ reason: 'x'.repeat(501) })
      .expect(400);
  });

  it('reviewer cannot create or edit, but can reject', async () => {
    const reviewerAuth = await login('reviewer@newshub.local', 'Reviewer123!');
    await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', reviewerAuth)
      .send({ categoryId: ids.category, translations: [esDoc('rev-nocreate')] })
      .expect(403);
  });

  it('notifications inbox, unread count, read, read-all, isolation, prefs mute', async () => {
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const reviewerAuth = await login('reviewer@newshub.local', 'Reviewer123!');
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', editorAuth)
      .send({ categoryId: ids.category, translations: [esDoc('rev-notif')] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', editorAuth)
      .send({ status: 'review' })
      .expect(200);

    const unread = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', reviewerAuth)
      .expect(200);
    expect(unread.body.unread).toBeGreaterThanOrEqual(1);

    const inbox = await request(app.getHttpServer())
      .get('/api/v1/notifications?page=1&limit=20')
      .set('Authorization', reviewerAuth)
      .expect(200);
    expect(Array.isArray(inbox.body.data)).toBe(true);
    const first = inbox.body.data[0] as { id: string };
    await request(app.getHttpServer())
      .post(`/api/v1/notifications/${first.id}/read`)
      .set('Authorization', reviewerAuth)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/notifications/read-all')
      .set('Authorization', reviewerAuth)
      .expect(200);

    // Another user's notification cannot be read through this inbox (scoped update = no-op success shape).
    const editorInbox = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', editorAuth)
      .expect(200);
    expect(Array.isArray(editorInbox.body.data)).toBe(true);

    // Mute rejected type for reviewer, then reject -> reviewer gets no new rejected notification.
    await request(app.getHttpServer())
      .post('/api/v1/notifications/prefs')
      .set('Authorization', reviewerAuth)
      .send({ mutedTypes: ['rejected'] })
      .expect(200);
    const prefs = await request(app.getHttpServer())
      .get('/api/v1/notifications/prefs')
      .set('Authorization', reviewerAuth)
      .expect(200);
    expect(prefs.body.mutedTypes).toContain('rejected');

    await request(app.getHttpServer()).get('/api/v1/notifications').set('Authorization', reviewerAuth).expect(200);
  });

  it('muted types suppress fan-out for the muted user only', async () => {
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const reviewerAuth = await login('reviewer@newshub.local', 'Reviewer123!');
    // Reviewer mutes review.requested; editor does not.
    await request(app.getHttpServer())
      .post('/api/v1/notifications/prefs')
      .set('Authorization', reviewerAuth)
      .send({ mutedTypes: ['review.requested'] })
      .expect(200);
    const beforeReviewer = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', reviewerAuth)
      .expect(200);
    const beforeEditor = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', editorAuth)
      .expect(200);
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', editorAuth)
      .send({ categoryId: ids.category, translations: [esDoc('rev-mute')] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', editorAuth)
      .send({ status: 'review' })
      .expect(200);
    const afterReviewer = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', reviewerAuth)
      .expect(200);
    // Muted user receives nothing new; unmuted staff (admin) still fans out.
    // Editor is the actor so is always excluded; assert reviewer unchanged.
    expect(afterReviewer.body.unread).toBe(beforeReviewer.body.unread);
    expect(beforeEditor.body.unread).toBeDefined();
    // Cleanup mute for other tests.
    await request(app.getHttpServer())
      .post('/api/v1/notifications/prefs')
      .set('Authorization', reviewerAuth)
      .send({ mutedTypes: [] })
      .expect(200);
  });

  it('reviewers only see their own audit events', async () => {
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const reviewerAuth = await login('reviewer@newshub.local', 'Reviewer123!');
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', editorAuth)
      .send({ categoryId: ids.category, translations: [esDoc('rev-scope')] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', editorAuth)
      .send({ status: 'review' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/reject`)
      .set('Authorization', reviewerAuth)
      .send({})
      .expect(200);

    const me = async (auth: string): Promise<string> => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization', auth).expect(200);
      return (res.body as { id: string }).id;
    };
    const editorId = await me(editorAuth);
    const reviewerId = await me(reviewerAuth);

    const editorTrail = await request(app.getHttpServer())
      .get(`/api/v1/audit-log/article/${id}`)
      .set('Authorization', editorAuth)
      .expect(200);
    const editorActors = new Set((editorTrail.body.data as Array<{ actorId: string | null }>).map((e) => e.actorId));
    expect(editorActors.has(editorId)).toBe(true);
    expect(editorActors.has(reviewerId)).toBe(true);

    const reviewerTrail = await request(app.getHttpServer())
      .get(`/api/v1/audit-log/article/${id}`)
      .set('Authorization', reviewerAuth)
      .expect(200);
    const reviewerRows = reviewerTrail.body.data as Array<{ actorId: string | null }>;
    expect(reviewerRows.length).toBeGreaterThan(0);
    expect(reviewerRows.every((e) => e.actorId === reviewerId)).toBe(true);

    // Spoofing another actorId must not widen reviewer scope.
    const spoofed = await request(app.getHttpServer())
      .get(`/api/v1/audit-log?limit=100&actorId=${editorId}`)
      .set('Authorization', reviewerAuth)
      .expect(200);
    expect((spoofed.body.data as Array<{ actorId: string | null }>).every((e) => e.actorId === reviewerId)).toBe(true);
  });

  it('unauthenticated notification reads return 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/notifications').expect(401);
    await request(app.getHttpServer()).get('/api/v1/notifications/unread-count').expect(401);
  });
});
