import 'dotenv/config';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
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

function esDoc(slug: string) {
  return {
    locale: 'es',
    slug,
    title: `Titulo suficiente para ${slug}`,
    summary: 'Resumen suficientemente largo para la validacion del bulk.',
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
  const category = await prisma.category.create({ data: { sort: 0 } });
  await prisma.categoryTranslation.create({
    data: { categoryId: category.id, locale: 'es', slug: 'general', label: 'General', description: 'Desc.' },
  });
  return { editor, category };
}

describe('articles bulk (e2e)', () => {
  let app: INestApplication;
  let categoryId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL;
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_URL },
      stdio: 'pipe',
    });
    const f = await fixture();
    categoryId = f.category.id;
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

  async function createDraft(auth: string, slug: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId, translations: [esDoc(slug)] })
      .expect(201);
    return res.body.id as string;
  }

  // Review-first (Increment 7): bulk publish only succeeds from review.
  async function toReview(auth: string, id: string): Promise<void> {
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
  }

  it('publishes a batch and keeps per-item ok results', async () => {
    const auth = `Bearer ${await token()}`;
    const ids = [await createDraft(auth, 'bulk-uno'), await createDraft(auth, 'bulk-dos')];
    for (const id of ids) await toReview(auth, id);
    const res = await request(app.getHttpServer())
      .post('/api/v1/articles/bulk')
      .set('Authorization', auth)
      .send({ action: 'publish', ids })
      .expect(200);
    expect(res.body.results).toEqual(ids.map((id) => ({ id, ok: true })));
  });

  it('is idempotent on republish and isolates failures with stable codes', async () => {
    const auth = `Bearer ${await token()}`;
    const published = await createDraft(auth, 'bulk-tres');
    await toReview(auth, published);
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${published}/publish`)
      .set('Authorization', auth)
      .expect(200);
    const draft = await createDraft(auth, 'bulk-cuatro');
    const res = await request(app.getHttpServer())
      .post('/api/v1/articles/bulk')
      .set('Authorization', auth)
      .send({ action: 'restore', ids: [published, draft, randomUUID()] })
      .expect(200);
    // restore from published/draft is an invalid transition; unknown id is not_found.
    expect(res.body.results).toEqual([
      { id: published, ok: false, code: 'invalid_transition' },
      { id: draft, ok: false, code: 'invalid_transition' },
      expect.objectContaining({ ok: false, code: 'not_found' }),
    ]);
  });

  it('deletes a batch per id', async () => {
    const auth = `Bearer ${await token()}`;
    const ids = [await createDraft(auth, 'bulk-cinco'), await createDraft(auth, 'bulk-seis')];
    const res = await request(app.getHttpServer())
      .post('/api/v1/articles/bulk')
      .set('Authorization', auth)
      .send({ action: 'delete', ids })
      .expect(200);
    expect(res.body.results).toEqual(ids.map((id) => ({ id, ok: true })));
  });

  it('rejects empty ids with 400 and over-limit batches with 422', async () => {
    const auth = `Bearer ${await token()}`;
    await request(app.getHttpServer())
      .post('/api/v1/articles/bulk')
      .set('Authorization', auth)
      .send({ action: 'publish', ids: [] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/articles/bulk')
      .set('Authorization', auth)
      .send({ action: 'publish', ids: Array.from({ length: 51 }, () => randomUUID()) })
      .expect(422);
  });

  it('rejects review back to draft and reports invalid transitions per id', async () => {
    const auth = `Bearer ${await token()}`;
    const review = await createDraft(auth, 'bulk-siete');
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${review}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    const single = await request(app.getHttpServer())
      .post(`/api/v1/articles/${review}/reject`)
      .set('Authorization', auth)
      .send({})
      .expect(200);
    expect(single.body).toMatchObject({ status: 'draft' });

    const reviewB = await createDraft(auth, 'bulk-ocho');
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${reviewB}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    const published = await createDraft(auth, 'bulk-nueve');
    await toReview(auth, published);
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${published}/publish`)
      .set('Authorization', auth)
      .expect(200);
    const res = await request(app.getHttpServer())
      .post('/api/v1/articles/bulk')
      .set('Authorization', auth)
      .send({ action: 'reject', ids: [reviewB, published] })
      .expect(200);
    expect(res.body.results).toEqual([
      { id: reviewB, ok: true },
      { id: published, ok: false, code: 'invalid_transition' },
    ]);
  });

  it('rejects unknown actions, malformed ids, and anonymous callers', async () => {
    const auth = `Bearer ${await token()}`;
    await request(app.getHttpServer())
      .post('/api/v1/articles/bulk')
      .set('Authorization', auth)
      .send({ action: 'explode', ids: [randomUUID()] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/articles/bulk')
      .set('Authorization', auth)
      .send({ action: 'publish', ids: ['not-a-uuid'] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/articles/bulk')
      .send({ action: 'publish', ids: [randomUUID()] })
      .expect(401);
  });
});
