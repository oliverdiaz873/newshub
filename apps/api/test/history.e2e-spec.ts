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

  async function token(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'editor@newshub.local', password: 'Editor123!' })
      .expect(200);
    return res.body.accessToken as string;
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
    return res.body.data as Array<{ action: string; entityType: string; entityId: string | null; actorId: string | null; metadata: Record<string, unknown> | null }>;
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
});
