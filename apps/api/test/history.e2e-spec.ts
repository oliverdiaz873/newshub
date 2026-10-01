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

function esDoc(slug: string, title = `Titulo suficiente para ${slug}`) {
  return {
    locale: 'es',
    slug,
    title,
    summary: 'Resumen suficientemente largo para la validacion de historial.',
    content: ['Parrafo uno.'],
  };
}

async function fixture() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "users", "authors", "categories", "articles", "opinions", "media_assets", "user_credentials", "refresh_tokens", "revisions", "audit_events" RESTART IDENTITY CASCADE',
  );
  const editor = await prisma.user.create({
    data: { email: 'editor@newshub.local', displayName: 'Editor', role: 'editor' },
  });
  await prisma.userCredential.create({
    data: { userId: editor.id, passwordHash: await hashPassword('Editor123!') },
  });
  const reviewer = await prisma.user.create({
    data: { email: 'reviewer@newshub.local', displayName: 'Reviewer', role: 'reviewer' },
  });
  await prisma.userCredential.create({
    data: { userId: reviewer.id, passwordHash: await hashPassword('Reviewer123!') },
  });
  const admin = await prisma.user.create({
    data: { email: 'admin@newshub.local', displayName: 'Admin', role: 'admin' },
  });
  await prisma.userCredential.create({
    data: { userId: admin.id, passwordHash: await hashPassword('Admin123!') },
  });
  const author = await prisma.author.create({ data: { slug: 'redaccion' } });
  await prisma.authorTranslation.create({
    data: { authorId: author.id, locale: 'es', name: 'Redacción', bio: null },
  });
  const category = await prisma.category.create({ data: { sort: 0 } });
  await prisma.categoryTranslation.create({
    data: { categoryId: category.id, locale: 'es', slug: 'general', label: 'General', description: 'Desc.' },
  });
  return { editor, author, category };
}

describe('history: revisions + audit (e2e)', () => {
  let app: INestApplication;
  let categoryId: string;
  let authorId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL;
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_URL },
      stdio: 'pipe',
    });
    const f = await fixture();
    categoryId = f.category.id;
    authorId = f.author.id;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new ProblemExceptionFilter());
    app.useGlobalInterceptors(new CacheControlInterceptor());
    await app.init();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // Tokens are memoized per user: the login route is throttled
  // (10/min), so repeated logins across tests would 429.
  const tokenCache = new Map<string, string>();
  async function token(email = 'editor@newshub.local', password = 'Editor123!'): Promise<string> {
    const hit = tokenCache.get(email);
    if (hit) return hit;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const access = res.body.accessToken as string;
    tokenCache.set(email, access);
    return access;
  }

  async function revisions(auth: string, id: string) {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/articles/${id}/revisions`)
      .set('Authorization', auth)
      .expect(200);
    return res.body.data as Array<{ version: number; cause: string }>;
  }

  async function audit(auth: string, query: string) {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/audit-log${query}`)
      .set('Authorization', auth)
      .expect(200);
    return res.body.data as Array<{ action: string; entityType: string; entityId: string | null; actorId: string | null; at: string; metadata: Record<string, unknown> | null }>;
  }

  it('versions create/update/transition and skips idempotent no-ops', async () => {
    const auth = `Bearer ${await token()}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('hist-uno')] })
      .expect(201);
    const id = created.body.id as string;
    expect(created.body.version).toBe(1);

    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ translations: [esDoc('hist-uno', 'Titulo editado suficiente')] })
      .expect(200);
    // Review-first (Increment 7): draft -> review via PATCH, then publish.
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/publish`)
      .set('Authorization', auth)
      .expect(200);
    // Idempotent republish: same POST status as any transition (201), no new revision.
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/publish`)
      .set('Authorization', auth)
      .expect(200);

    const rows = await revisions(auth, id);
    expect(rows.map((r) => r.version)).toEqual([4, 3, 2, 1]);
    expect(rows.map((r) => r.cause)).toEqual(['transition:publish', 'edit', 'edit', 'create']);

    const trail = await audit(auth, `?entityType=article&entityId=${id}`);
    expect(trail.map((r) => r.action)).toEqual(
      expect.arrayContaining(['create', 'update', 'publish']),
    );
    const publish = trail.find((r) => r.action === 'publish');
    expect(publish?.metadata).toMatchObject({ beforeStatus: 'review', afterStatus: 'published', version: 4 });
  });

  it('restores a revision as a new version without rewriting history', async () => {
    const auth = `Bearer ${await token()}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('hist-dos')] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ translations: [esDoc('hist-dos', 'Titulo segunda version suficiente')] })
      .expect(200);

    const restored = await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/revisions/1/restore`)
      .set('Authorization', auth)
      .expect(200);
    expect(restored.body.version).toBe(3);

    const read = await request(app.getHttpServer())
      .get(`/api/v1/editorial/articles/${id}`)
      .set('Authorization', auth)
      .expect(200);
    const es = (read.body.translations as Array<{ locale: string; title: string }>).find((t) => t.locale === 'es');
    expect(es?.title).toBe('Titulo suficiente para hist-dos');

    const rows = await revisions(auth, id);
    expect(rows.map((r) => r.version)).toEqual([3, 2, 1]);
    expect(rows[0].cause).toBe('restore');

    const trail = await audit(auth, `?entityType=article&entityId=${id}&action=revision.restore`);
    expect(trail).toHaveLength(1);
    expect(trail[0].metadata).toMatchObject({ restoredVersion: 1, version: 3 });

    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/revisions/99/restore`)
      .set('Authorization', auth)
      .expect(404);
  });

  it('refuses to restore published items (unpublish-first)', async () => {
    const auth = `Bearer ${await token()}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('hist-tres')] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/publish`)
      .set('Authorization', auth)
      .expect(200);
    const res = await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/revisions/1/restore`)
      .set('Authorization', auth)
      .expect(409);
    expect(res.body.code).toBe('invalid_transition');
  });

  it('audits bulk per item including failures without rollback', async () => {
    const auth = `Bearer ${await token()}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('hist-cuatro')] })
      .expect(201);
    const id = created.body.id as string;
    const res = await request(app.getHttpServer())
      .post('/api/v1/articles/bulk')
      .set('Authorization', auth)
      .send({ action: 'restore', ids: [id] })
      .expect(200);
    expect(res.body.results).toEqual([{ id, ok: false, code: 'invalid_transition' }]);

    const trail = await audit(auth, `?entityType=article&entityId=${id}&action=restore`);
    expect(trail).toHaveLength(1);
    expect(trail[0].metadata).toMatchObject({ ok: false, code: 'invalid_transition', bulk: true });

    // The draft itself is untouched and still usable (via review-first).
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/publish`)
      .set('Authorization', auth)
      .expect(200);
  });

  it('emits schedule lifecycle + system execution events', async () => {
    const auth = `Bearer ${await token()}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('hist-cinco')] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/schedule`)
      .set('Authorization', auth)
      .send({ scheduledAt: new Date(Date.now() + 3600_000).toISOString() })
      .expect(200);
    await prisma.article.update({ where: { id }, data: { scheduledAt: new Date(Date.now() - 5000) } });

    const { SchedulingService } = await import('../src/modules/scheduling/scheduling.service');
    const scheduler: { tick: (now: Date) => Promise<unknown> } = app.get(SchedulingService);
    await scheduler.tick(new Date());

    const trail = await audit(auth, `?entityType=article&entityId=${id}`);
    const actions = trail.map((r) => r.action);
    expect(actions).toEqual(expect.arrayContaining(['schedule.set', 'publish']));
    const published = trail.find((r) => r.action === 'publish');
    expect(published?.metadata).toMatchObject({ via: 'schedule.execute' });

    const rows = await revisions(auth, id);
    expect(rows.map((r) => r.cause)).toEqual(expect.arrayContaining(['schedule.set', 'schedule.execute']));
  });

  it('versions and audits opinions with parity', async () => {
    const auth = `Bearer ${await token()}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/opinions')
      .set('Authorization', auth)
      .send({ authorId, translations: [esDoc('hist-op')] })
      .expect(201);
    const id = created.body.id as string;
    expect(created.body.version).toBe(1);

    await request(app.getHttpServer())
      .patch(`/api/v1/opinions/${id}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/opinions/${id}/publish`)
      .set('Authorization', auth)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/opinions/${id}/unpublish`)
      .set('Authorization', auth)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/opinions/${id}/revisions`)
      .set('Authorization', auth)
      .expect(200);
    expect((res.body.data as Array<{ version: number }>).map((r) => r.version)).toEqual([4, 3, 2, 1]);

    const trail = await audit(auth, `?entityType=opinion&entityId=${id}`);
    expect(trail.map((r) => r.action)).toEqual(expect.arrayContaining(['create', 'publish', 'unpublish']));
  });

  it('keeps the audit trail immutable (no write surface)', async () => {
    const auth = `Bearer ${await token()}`;
    await request(app.getHttpServer()).put('/api/v1/audit-log/xyz').set('Authorization', auth).send({}).expect(404);
    await request(app.getHttpServer()).delete('/api/v1/audit-log/xyz').set('Authorization', auth).expect(404);
    await request(app.getHttpServer()).post('/api/v1/audit-log').set('Authorization', auth).send({}).expect(404);
  });

  it('requires authentication for history and audit reads', async () => {
    await request(app.getHttpServer()).get('/api/v1/audit-log').expect(401);
    await request(app.getHttpServer()).get('/api/v1/articles/00000000-0000-4000-8000-000000000000/revisions').expect(401);
  });

  it('reads a single revision and 404s on unknown version or article', async () => {
    const auth = `Bearer ${await token()}`;
    const reviewerAuth = `Bearer ${await token('reviewer@newshub.local', 'Reviewer123!')}`;
    const adminAuth = `Bearer ${await token('admin@newshub.local', 'Admin123!')}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('hist-single')] })
      .expect(201);
    const id = created.body.id as string;

    const one = await request(app.getHttpServer())
      .get(`/api/v1/articles/${id}/revisions/1`)
      .set('Authorization', auth)
      .expect(200);
    expect(one.body.version).toBe(1);
    expect(one.body.cause).toBe('create');
    expect(one.body.snapshot.translations[0].slug).toBe('hist-single');

    // Same contract for opinions.
    const op = await request(app.getHttpServer())
      .post('/api/v1/opinions')
      .set('Authorization', auth)
      .send({ authorId, translations: [esDoc('hist-single-op')] })
      .expect(201);
    const opId = op.body.id as string;
    const opOne = await request(app.getHttpServer())
      .get(`/api/v1/opinions/${opId}/revisions/1`)
      .set('Authorization', auth)
      .expect(200);
    expect(opOne.body.version).toBe(1);

    // Reviewer and admin may read; anonymous may not.
    await request(app.getHttpServer())
      .get(`/api/v1/articles/${id}/revisions/1`)
      .set('Authorization', reviewerAuth)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/articles/${id}/revisions/1`)
      .set('Authorization', adminAuth)
      .expect(200);
    await request(app.getHttpServer()).get(`/api/v1/articles/${id}/revisions/1`).expect(401);

    // Unknown version / unknown article (valid UUID) → 404.
    await request(app.getHttpServer())
      .get(`/api/v1/articles/${id}/revisions/99`)
      .set('Authorization', auth)
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/articles/00000000-0000-4000-8000-000000000000/revisions/1')
      .set('Authorization', auth)
      .expect(404);
  });

  it('paginates revision lists newest-first with stable meta', async () => {
    const auth = `Bearer ${await token()}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('hist-pag')] })
      .expect(201);
    const id = created.body.id as string;
    for (const n of [2, 3, 4, 5]) {
      await request(app.getHttpServer())
        .patch(`/api/v1/articles/${id}`)
        .set('Authorization', auth)
        .send({ translations: [esDoc('hist-pag', `Titulo version ${n} suficiente`)] })
        .expect(200);
    }

    const p1 = await request(app.getHttpServer())
      .get(`/api/v1/articles/${id}/revisions?limit=2`)
      .set('Authorization', auth)
      .expect(200);
    expect(p1.body.meta).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });
    expect(p1.body.data.map((r: { version: number }) => r.version)).toEqual([5, 4]);

    const p2 = await request(app.getHttpServer())
      .get(`/api/v1/articles/${id}/revisions?limit=2&page=2`)
      .set('Authorization', auth)
      .expect(200);
    expect(p2.body.data.map((r: { version: number }) => r.version)).toEqual([3, 2]);

    const p3 = await request(app.getHttpServer())
      .get(`/api/v1/articles/${id}/revisions?limit=2&page=3`)
      .set('Authorization', auth)
      .expect(200);
    expect(p3.body.data.map((r: { version: number }) => r.version)).toEqual([1]);

    // Out of range: empty data, totals preserved.
    const far = await request(app.getHttpServer())
      .get(`/api/v1/articles/${id}/revisions?limit=2&page=9`)
      .set('Authorization', auth)
      .expect(200);
    expect(far.body.data).toEqual([]);
    expect(far.body.meta).toMatchObject({ page: 9, total: 5, totalPages: 3 });

    // Opinions share the contract.
    const op = await request(app.getHttpServer())
      .post('/api/v1/opinions')
      .set('Authorization', auth)
      .send({ authorId, translations: [esDoc('hist-pag-op')] })
      .expect(201);
    const opId = op.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/opinions/${opId}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    const opPage = await request(app.getHttpServer())
      .get(`/api/v1/opinions/${opId}/revisions?limit=1&page=2`)
      .set('Authorization', auth)
      .expect(200);
    expect(opPage.body.meta).toMatchObject({ total: 2, totalPages: 2 });
    expect(opPage.body.data.map((r: { version: number }) => r.version)).toEqual([1]);
  });

  it('forbids revision restore for reviewers without recording', async () => {
    const auth = `Bearer ${await token()}`;
    const reviewerAuth = `Bearer ${await token('reviewer@newshub.local', 'Reviewer123!')}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('hist-rev403')] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ translations: [esDoc('hist-rev403', 'Titulo editado suficiente largo')] })
      .expect(200);
    expect((await revisions(auth, id)).map((r) => r.version)).toEqual([2, 1]);

    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/revisions/1/restore`)
      .set('Authorization', reviewerAuth)
      .expect(403);

    // Rejected restore records nothing.
    expect((await revisions(auth, id)).map((r) => r.version)).toEqual([2, 1]);
    const trail = await audit(auth, `?entityType=article&entityId=${id}&action=revision.restore`);
    expect(trail).toHaveLength(0);
  });

  it('restores archived content preserving its status', async () => {
    const auth = `Bearer ${await token()}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('hist-arch')] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/archive`)
      .set('Authorization', auth)
      .expect(200);
    const archived = await prisma.article.findUnique({ where: { id }, select: { status: true } });
    expect(archived?.status).toBe('archived');

    const restored = await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/revisions/1/restore`)
      .set('Authorization', auth)
      .expect(200);
    expect(restored.body.version).toBe(3);

    // Status comes from the live row, never from the snapshot.
    const after = await prisma.article.findUnique({ where: { id }, select: { status: true } });
    expect(after?.status).toBe('archived');

    // New version appended; the original revision is untouched.
    const rows = await revisions(auth, id);
    expect(rows.map((r) => r.version)).toEqual([3, 2, 1]);
    expect(rows[0].cause).toBe('restore');
    const v1 = await request(app.getHttpServer())
      .get(`/api/v1/articles/${id}/revisions/1`)
      .set('Authorization', auth)
      .expect(200);
    expect(v1.body.snapshot.translations[0].title).toBe('Titulo suficiente para hist-arch');
    const read = await request(app.getHttpServer())
      .get(`/api/v1/editorial/articles/${id}`)
      .set('Authorization', auth)
      .expect(200);
    const es = (read.body.translations as Array<{ locale: string; title: string }>).find((t) => t.locale === 'es');
    expect(es?.title).toBe('Titulo suficiente para hist-arch');
  });

  it('skips revision and audit for an identical PATCH (D1)', async () => {
    const auth = `Bearer ${await token()}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('hist-nop')] })
      .expect(201);
    const id = created.body.id as string;
    // Real change: draft -> review versions.
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    expect((await revisions(auth, id)).map((r) => r.version)).toEqual([2, 1]);
    // Status-identical PATCH: 200, no new version, no new audit event.
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    expect((await revisions(auth, id)).map((r) => r.version)).toEqual([2, 1]);
    // Content-identical PATCH: same title/summary as current.
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ translations: [esDoc('hist-nop')] })
      .expect(200);
    expect((await revisions(auth, id)).map((r) => r.version)).toEqual([2, 1]);
    let trail = await audit(auth, `?entityType=article&entityId=${id}&action=update`);
    expect(trail).toHaveLength(1);
    // Real content change still versions and audits.
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ translations: [esDoc('hist-nop', 'Titulo cambiado suficiente largo')] })
      .expect(200);
    expect((await revisions(auth, id)).map((r) => r.version)).toEqual([3, 2, 1]);
    trail = await audit(auth, `?entityType=article&entityId=${id}&action=update`);
    expect(trail).toHaveLength(2);

    // Same contract for opinions.
    const op = await request(app.getHttpServer())
      .post('/api/v1/opinions')
      .set('Authorization', auth)
      .send({ authorId, translations: [esDoc('hist-nop-op')] })
      .expect(201);
    const opId = op.body.id as string;
    const opRevisions = async () =>
      (await request(app.getHttpServer()).get(`/api/v1/opinions/${opId}/revisions`).set('Authorization', auth).expect(200))
        .body.data as Array<{ version: number }>;
    await request(app.getHttpServer())
      .patch(`/api/v1/opinions/${opId}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    expect((await opRevisions()).map((r) => r.version)).toEqual([2, 1]);
    await request(app.getHttpServer())
      .patch(`/api/v1/opinions/${opId}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/opinions/${opId}`)
      .set('Authorization', auth)
      .send({ translations: [esDoc('hist-nop-op')] })
      .expect(200);
    expect((await opRevisions()).map((r) => r.version)).toEqual([2, 1]);
    const opTrail = await audit(auth, `?entityType=opinion&entityId=${opId}&action=update`);
    expect(opTrail).toHaveLength(1);
    await request(app.getHttpServer())
      .patch(`/api/v1/opinions/${opId}`)
      .set('Authorization', auth)
      .send({ translations: [esDoc('hist-nop-op', 'Titulo cambiado opinion largo')] })
      .expect(200);
    expect((await opRevisions()).map((r) => r.version)).toEqual([3, 2, 1]);
  });

  it('audits failed logins without an actor', async () => {
    const auth = `Bearer ${await token()}`;
    const me = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization', auth).expect(200);
    const editorId = me.body.id as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'editor@newshub.local', password: 'Wrong-pass-1!' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody-freeze@newshub.local', password: 'Wrong-pass-1!' })
      .expect(401);

    const rows = await audit(auth, '?action=login.failed&limit=100');
    const known = rows.find((r) => r.entityId === editorId);
    expect(known).toMatchObject({ action: 'login.failed', entityType: 'user', entityId: editorId, actorId: null });
    expect(known?.metadata).toBeNull();
    expect(new Date(known?.at ?? '').getTime()).not.toBeNaN();
    const unknown = rows.find((r) => r.entityId === null);
    expect(unknown).toMatchObject({ action: 'login.failed', entityType: 'user', entityId: null, actorId: null });
  });

  it('filters audit events by date range', async () => {
    const auth = `Bearer ${await token()}`;
    const past = new Date(Date.now() - 3600_000).toISOString();
    const future = new Date(Date.now() + 3600_000).toISOString();
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('hist-dates')] })
      .expect(201);
    const id = created.body.id as string;

    // Open future window: nothing yet.
    const empty = await request(app.getHttpServer())
      .get(`/api/v1/audit-log?from=${encodeURIComponent(future)}`)
      .set('Authorization', auth)
      .expect(200);
    expect(empty.body.data).toEqual([]);
    expect(empty.body.meta).toMatchObject({ total: 0, totalPages: 1 });

    // Closed past window: nothing either.
    const old = await request(app.getHttpServer())
      .get(`/api/v1/audit-log?to=${encodeURIComponent(past)}`)
      .set('Authorization', auth)
      .expect(200);
    expect(old.body.data).toEqual([]);

    // Window around now: our create is inside, with pagination meta.
    const inside = await request(app.getHttpServer())
      .get(`/api/v1/audit-log?from=${encodeURIComponent(past)}&to=${encodeURIComponent(future)}&action=create&entityType=article&limit=100`)
      .set('Authorization', auth)
      .expect(200);
    expect(inside.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(inside.body.meta.totalPages).toBeGreaterThanOrEqual(1);
    expect((inside.body.data as Array<{ entityId: string | null }>).map((r) => r.entityId)).toContain(id);
  });

  it('serves the entity audit trail newest-first', async () => {
    const auth = `Bearer ${await token()}`;
    const me = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization', auth).expect(200);
    const editorId = me.body.id as string;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('hist-trail')] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ translations: [esDoc('hist-trail', 'Titulo editado para trail largo')] })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/audit-log/article/${id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    for (const row of res.body.data as Array<{ entityType: string; entityId: string | null }>) {
      expect(row.entityType).toBe('article');
      expect(row.entityId).toBe(id);
    }
    const ats = (res.body.data as Array<{ at: string }>).map((r) => new Date(r.at).getTime());
    expect([...ats].sort((a, b) => b - a)).toEqual(ats);
    expect(res.body.data.map((r: { action: string }) => r.action)).toEqual(
      expect.arrayContaining(['create', 'update']),
    );
    expect(res.body.data[0]).toMatchObject({ actorId: editorId });
    expect(res.body.meta).toMatchObject({ page: 1 });

    // Unknown entity: 200 with empty data.
    const missing = await request(app.getHttpServer())
      .get('/api/v1/audit-log/article/00000000-0000-4000-8000-000000000000')
      .set('Authorization', auth)
      .expect(200);
    expect(missing.body.data).toEqual([]);
  });
});
