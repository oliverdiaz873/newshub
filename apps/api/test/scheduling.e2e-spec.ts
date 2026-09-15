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
import { SchedulingService } from '../src/modules/scheduling/scheduling.service';
import { hashPassword } from '../src/modules/auth/password';

const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('TEST_DATABASE_URL is required for e2e.');

const prisma = new PrismaClient({ datasourceUrl: TEST_URL });

function esDoc(slug: string) {
  return {
    locale: 'es',
    slug,
    title: `Titulo suficiente para ${slug}`,
    summary: 'Resumen suficientemente largo para la validacion de scheduling.',
    content: ['Parrafo uno.'],
  };
}

async function fixture() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "users", "authors", "categories", "articles", "opinions", "media_assets", "user_credentials", "refresh_tokens" RESTART IDENTITY CASCADE',
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

describe('scheduling (e2e)', () => {
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

  async function createReviewArticle(auth: string, slug: string): Promise<string> {
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
    return id;
  }

  it('schedules review items and rejects drafts with 409', async () => {
    const auth = `Bearer ${await token()}`;
    const id = await createReviewArticle(auth, 'sched-uno');
    const future = new Date(Date.now() + 3600_000).toISOString();
    const scheduled = await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/schedule`)
      .set('Authorization', auth)
      .send({ scheduledAt: future })
      .expect(200);
    expect(scheduled.body.scheduledAt).toBeDefined();

    const draft = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc('sched-dos')] })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${draft.body.id}/schedule`)
      .set('Authorization', auth)
      .send({ scheduledAt: future })
      .expect(409);
  });

  it('rejects past instants with 422 and malformed bodies with 400', async () => {
    const auth = `Bearer ${await token()}`;
    const id = await createReviewArticle(auth, 'sched-tres');
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/schedule`)
      .set('Authorization', auth)
      .send({ scheduledAt: new Date(Date.now() - 1000).toISOString() })
      .expect(422);
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/schedule`)
      .set('Authorization', auth)
      .send({ scheduledAt: 'mañana' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/schedule`)
      .send({ scheduledAt: new Date(Date.now() + 1000).toISOString() })
      .expect(401);
  });

  it('unschedules idempotently and clears schedule on manual publish', async () => {
    const auth = `Bearer ${await token()}`;
    const id = await createReviewArticle(auth, 'sched-cuatro');
    const future = new Date(Date.now() + 3600_000).toISOString();
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/schedule`)
      .set('Authorization', auth)
      .send({ scheduledAt: future })
      .expect(200);
    const cleared = await request(app.getHttpServer())
      .delete(`/api/v1/articles/${id}/schedule`)
      .set('Authorization', auth)
      .expect(200);
    expect(cleared.body.scheduledAt).toBeNull();
    await request(app.getHttpServer())
      .delete(`/api/v1/articles/${id}/schedule`)
      .set('Authorization', auth)
      .expect(200);

    const id2 = await createReviewArticle(auth, 'sched-cinco');
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id2}/schedule`)
      .set('Authorization', auth)
      .send({ scheduledAt: future })
      .expect(200);
    const published = await request(app.getHttpServer())
      .post(`/api/v1/articles/${id2}/publish`)
      .set('Authorization', auth)
      .expect(200);
    expect(published.body.scheduledAt).toBeNull();
    expect(published.body.status).toBe('published');
  });

  it('executes due schedules and surfaces overdue honestly', async () => {
    const auth = `Bearer ${await token()}`;
    const id = await createReviewArticle(auth, 'sched-seis');
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/schedule`)
      .set('Authorization', auth)
      .send({ scheduledAt: new Date(Date.now() + 3600_000).toISOString() })
      .expect(200);
    // Force the instant into the past at the DB level (the API rightly
    // refuses past instants); the executor must then publish it.
    await prisma.article.update({ where: { id }, data: { scheduledAt: new Date(Date.now() - 5000) } });
    const overdue = await request(app.getHttpServer())
      .get('/api/v1/editorial/articles?overdue=true&limit=100')
      .set('Authorization', auth)
      .expect(200);
    expect(overdue.body.data.map((row: { id: string }) => row.id)).toContain(id);

    const scheduler = app.get(SchedulingService);
    const out = await scheduler.tick(new Date());
    expect(out.articles.published).toContain(id);

    const read = await request(app.getHttpServer())
      .get(`/api/v1/editorial/articles/${id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(read.body.status).toBe('published');
    expect(read.body.scheduledAt).toBeNull();
    expect(read.body.firstPublishedAt).toEqual(expect.any(String));
  });

  it('schedules and executes opinions with parity', async () => {
    const auth = `Bearer ${await token()}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/opinions')
      .set('Authorization', auth)
      .send({ authorId, translations: [esDoc('sched-op')] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/opinions/${id}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/opinions/${id}/schedule`)
      .set('Authorization', auth)
      .send({ scheduledAt: new Date(Date.now() + 3600_000).toISOString() })
      .expect(200);
    await prisma.opinion.update({ where: { id }, data: { scheduledAt: new Date(Date.now() - 5000) } });
    const scheduler = app.get(SchedulingService);
    const out = await scheduler.tick(new Date());
    expect(out.opinions.published).toContain(id);
    const read = await request(app.getHttpServer())
      .get(`/api/v1/editorial/opinions/${id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(read.body.status).toBe('published');
    expect(read.body.scheduledAt).toBeNull();
  });
});
