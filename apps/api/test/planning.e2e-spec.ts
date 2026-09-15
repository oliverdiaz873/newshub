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

async function fixture() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "users", "authors", "categories", "articles", "opinions", "media_assets", "user_credentials", "refresh_tokens", "revisions", "audit_events", "notifications", "notification_prefs", "planning_items" RESTART IDENTITY CASCADE',
  );
  const mk = async (email: string, role: string, pass: string) => {
    const u = await prisma.user.create({ data: { email, displayName: email, role } });
    await prisma.userCredential.create({ data: { userId: u.id, passwordHash: await hashPassword(pass) } });
    return u;
  };
  const editor = await mk('editor@newshub.local', 'editor', 'Editor123!');
  const reviewer = await mk('reviewer@newshub.local', 'reviewer', 'Reviewer123!');
  await mk('admin@newshub.local', 'admin', 'Admin123!');
  const category = await prisma.category.create({ data: { sort: 0 } });
  await prisma.categoryTranslation.create({
    data: { categoryId: category.id, locale: 'es', slug: 'politica', label: 'Política', description: 'Desc.' },
  });
  return { editor, reviewer, category };
}

describe('Increment 8 planning (e2e)', () => {
  let app: INestApplication;
  let ids: { category: string; editor: string; reviewer: string };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL;
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_URL },
      stdio: 'pipe',
    });
    const f = await fixture();
    ids = { category: f.category.id, editor: f.editor.id, reviewer: f.reviewer.id };
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

  const tokenCache = new Map<string, string>();
  async function login(email: string, password: string): Promise<string> {
    const hit = tokenCache.get(email);
    if (hit) return hit;
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password }).expect(200);
    const bearer = `Bearer ${res.body.accessToken as string}`;
    tokenCache.set(email, bearer);
    return bearer;
  }

  it('creates pitches and assignments, assigning notifies the assignee', async () => {
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const pitch = await request(app.getHttpServer())
      .post('/api/v1/planning')
      .set('Authorization', editorAuth)
      .send({ type: 'pitch', title: 'Pitch de prueba uno' })
      .expect(201);
    expect(pitch.body).toMatchObject({ type: 'pitch', status: 'pitched' });

    const assignment = await request(app.getHttpServer())
      .post('/api/v1/planning')
      .set('Authorization', editorAuth)
      .send({
        type: 'assignment',
        title: 'Assignment de prueba',
        assigneeId: ids.editor,
        reviewerId: ids.reviewer,
        dueAt: new Date(Date.now() + 3600_000).toISOString(),
      })
      .expect(201);
    expect(assignment.body).toMatchObject({ type: 'assignment', status: 'assigned' });

    const reviewerAuth = await login('reviewer@newshub.local', 'Reviewer123!');
    const inbox = await request(app.getHttpServer())
      .get('/api/v1/notifications?limit=100')
      .set('Authorization', reviewerAuth)
      .expect(200);
    const types = (inbox.body.data as Array<{ type: string }>).map((n) => n.type);
    expect(types).toContain('assigned');
  });

  it('runs the full transition cycle and rejects illegal moves with 409', async () => {
    const auth = await login('editor@newshub.local', 'Editor123!');
    const created = await request(app.getHttpServer())
      .post('/api/v1/planning')
      .set('Authorization', auth)
      .send({ type: 'pitch', title: 'Ciclo completo planning' })
      .expect(201);
    const id = created.body.id as string;
    // pitched -> publish-style direct complete is illegal.
    const illegal = await request(app.getHttpServer())
      .post(`/api/v1/planning/${id}/complete`)
      .set('Authorization', auth)
      .expect(409);
    expect(illegal.body.code).toBe('invalid_transition');

    await request(app.getHttpServer()).post(`/api/v1/planning/${id}/assign`).set('Authorization', auth).send({ assigneeId: ids.editor }).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/planning/${id}/start`).set('Authorization', auth).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/planning/${id}/submit`).set('Authorization', auth).expect(200);
    const done = await request(app.getHttpServer()).post(`/api/v1/planning/${id}/complete`).set('Authorization', auth).expect(200);
    expect(done.body.status).toBe('done');
    const reopened = await request(app.getHttpServer()).post(`/api/v1/planning/${id}/reopen`).set('Authorization', auth).expect(200);
    expect(reopened.body.status).toBe('pitched');
    // Idempotent reopen: already pitched -> 200/201 unchanged.
    await request(app.getHttpServer()).post(`/api/v1/planning/${id}/reopen`).set('Authorization', auth).expect(200);
  });

  it('validates assignees and rejects unknown users with 404', async () => {
    const auth = await login('editor@newshub.local', 'Editor123!');
    await request(app.getHttpServer())
      .post('/api/v1/planning')
      .set('Authorization', auth)
      .send({ type: 'assignment', title: 'Sin asignado valido', assigneeId: '00000000-0000-4000-8000-000000000000' })
      .expect(404);
    const created = await request(app.getHttpServer())
      .post('/api/v1/planning')
      .set('Authorization', auth)
      .send({ type: 'pitch', title: 'Assign sin body' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/planning/${created.body.id}/assign`)
      .set('Authorization', auth)
      .send({})
      .expect(400);
  });

  it('enforces reviewer restrictions and scopes reviewer reads', async () => {
    const reviewerAuth = await login('reviewer@newshub.local', 'Reviewer123!');
    await request(app.getHttpServer())
      .post('/api/v1/planning')
      .set('Authorization', reviewerAuth)
      .send({ type: 'pitch', title: 'Reviewer no crea' })
      .expect(403);

    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const hidden = await request(app.getHttpServer())
      .post('/api/v1/planning')
      .set('Authorization', editorAuth)
      .send({ type: 'pitch', title: 'Oculto para reviewer' })
      .expect(201);
    // Reviewer cannot read unrelated pitched items (404, no leak).
    await request(app.getHttpServer())
      .get(`/api/v1/planning/${hidden.body.id}`)
      .set('Authorization', reviewerAuth)
      .expect(404);
    // After submit to in-review, the reviewer queue includes it.
    await request(app.getHttpServer()).post(`/api/v1/planning/${hidden.body.id}/assign`).set('Authorization', editorAuth).send({ assigneeId: ids.editor }).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/planning/${hidden.body.id}/start`).set('Authorization', editorAuth).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/planning/${hidden.body.id}/submit`).set('Authorization', editorAuth).expect(200);
    const queue = await request(app.getHttpServer())
      .get('/api/v1/planning/review-queue')
      .set('Authorization', reviewerAuth)
      .expect(200);
    expect((queue.body as Array<{ id: string }>).map((i) => i.id)).toContain(hidden.body.id);
    // Reviewer can complete (approve) in-review items.
    const done = await request(app.getHttpServer())
      .post(`/api/v1/planning/${hidden.body.id}/complete`)
      .set('Authorization', reviewerAuth)
      .expect(200);
    expect(done.body.status).toBe('done');
  });

  it('flags overdue items and serves the calendar', async () => {
    const auth = await login('editor@newshub.local', 'Editor123!');
    const past = await request(app.getHttpServer())
      .post('/api/v1/planning')
      .set('Authorization', auth)
      .send({ type: 'assignment', title: 'Vencido planning', assigneeId: ids.editor, dueAt: new Date(Date.now() - 3600_000).toISOString() })
      .expect(201);
    expect(past.body.overdue).toBe(true);
    const over = await request(app.getHttpServer())
      .get('/api/v1/planning?overdue=true')
      .set('Authorization', auth)
      .expect(200);
    expect((over.body.data as Array<{ id: string }>).map((i) => i.id)).toContain(past.body.id);

    const from = new Date(Date.now() - 24 * 3600_000).toISOString();
    const to = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
    const cal = await request(app.getHttpServer())
      .get(`/api/v1/planning/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .set('Authorization', auth)
      .expect(200);
    expect(Array.isArray(cal.body.items)).toBe(true);
    expect(Array.isArray(cal.body.scheduled)).toBe(true);
    expect((cal.body.items as Array<{ id: string }>).map((i) => i.id)).toContain(past.body.id);
  });

  it('combines text search with the overdue filter', async () => {
    const auth = await login('editor@newshub.local', 'Editor123!');
    const overdue = await request(app.getHttpServer())
      .post('/api/v1/planning')
      .set('Authorization', auth)
      .send({ type: 'pitch', title: 'ComboQ vencido unico', dueAt: new Date(Date.now() - 3600_000).toISOString() })
      .expect(201);
    const fresh = await request(app.getHttpServer())
      .post('/api/v1/planning')
      .set('Authorization', auth)
      .send({ type: 'pitch', title: 'ComboQ vigente unico', dueAt: new Date(Date.now() + 3600_000).toISOString() })
      .expect(201);
    const idsOf = (body: { data: Array<{ id: string }> }) => body.data.map((i) => i.id);

    const both = await request(app.getHttpServer())
      .get('/api/v1/planning?q=ComboQ')
      .set('Authorization', auth)
      .expect(200);
    expect(idsOf(both.body)).toEqual(expect.arrayContaining([overdue.body.id, fresh.body.id]));

    const onlyOverdue = await request(app.getHttpServer())
      .get('/api/v1/planning?q=ComboQ&overdue=true')
      .set('Authorization', auth)
      .expect(200);
    expect(idsOf(onlyOverdue.body)).toEqual([overdue.body.id]);

    // Regression: overdue=false must keep filtering by q, not leak others.
    const onlyFresh = await request(app.getHttpServer())
      .get('/api/v1/planning?q=ComboQ&overdue=false')
      .set('Authorization', auth)
      .expect(200);
    expect(idsOf(onlyFresh.body)).toEqual([fresh.body.id]);
  });

  it('audits planning actions and honors muted notification types', async () => {
    const editorAuth = await login('editor@newshub.local', 'Editor123!');
    const reviewerAuth = await login('reviewer@newshub.local', 'Reviewer123!');
    const created = await request(app.getHttpServer())
      .post('/api/v1/planning')
      .set('Authorization', editorAuth)
      .send({ type: 'pitch', title: 'Auditoria planning' })
      .expect(201);
    const trail = await request(app.getHttpServer())
      .get(`/api/v1/audit-log/planning/${created.body.id}`)
      .set('Authorization', editorAuth)
      .expect(200);
    expect((trail.body.data as Array<{ action: string }>).map((e) => e.action)).toContain('create');

    await request(app.getHttpServer())
      .post('/api/v1/notifications/prefs')
      .set('Authorization', reviewerAuth)
      .send({ mutedTypes: ['assigned', 'due.soon', 'overdue', 'planning.transition'] })
      .expect(200);
    const prefs = await request(app.getHttpServer())
      .get('/api/v1/notifications/prefs')
      .set('Authorization', reviewerAuth)
      .expect(200);
    expect(prefs.body.mutedTypes).toEqual(expect.arrayContaining(['assigned']));
    await request(app.getHttpServer())
      .post('/api/v1/notifications/prefs')
      .set('Authorization', reviewerAuth)
      .send({ mutedTypes: [] })
      .expect(200);
  });

  it('requires auth and paginates the list', async () => {
    await request(app.getHttpServer()).get('/api/v1/planning').expect(401);
    const auth = await login('editor@newshub.local', 'Editor123!');
    const page = await request(app.getHttpServer())
      .get('/api/v1/planning?page=1&limit=20')
      .set('Authorization', auth)
      .expect(200);
    expect(page.body.meta.limit).toBe(20);
    expect(typeof page.body.meta.total).toBe('number');
  });
});
