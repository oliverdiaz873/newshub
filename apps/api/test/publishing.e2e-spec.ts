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

const ES = {
  locale: 'es',
  slug: 'ciclo-f4',
  title: 'Ciclo F4 con titulo suficiente',
  summary: 'Resumen suficientemente largo para la validacion.',
  content: ['Parrafo uno.'],
};

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
    data: { categoryId: category.id, locale: 'es', slug: 'politica', label: 'Política', description: 'Desc.' },
  });
  return { editor, author, category };
}

describe('F4 publishing (e2e)', () => {
  let app: INestApplication;
  let ids: { editor: string; author: string; category: string };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL;
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_URL },
      stdio: 'pipe',
    });
    const f = await fixture();
    ids = { editor: f.editor.id, author: f.author.id, category: f.category.id };
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

  it('publishes drafts, keeps firstPublishedAt immutable, unpublishes cleanly', async () => {
    const at = await token();
    const auth = `Bearer ${at}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({ categoryId: ids.category, translations: [ES] })
      .expect(201);
    const id = created.body.id as string;
    const published = await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/publish`)
      .set('Authorization', auth)
      .expect(201);
    expect(published.body).toMatchObject({ status: 'published' });
    expect(published.body.firstPublishedAt).toEqual(expect.any(String));
    const first = published.body.firstPublishedAt as string;
    await request(app.getHttpServer()).get('/api/v1/articles/ciclo-f4?locale=es').expect(200);
    const audit = await prisma.article.findUniqueOrThrow({ where: { id } });
    expect(audit.updatedById).toBe(ids.editor);
    expect(audit.publishedAt?.toISOString()).toBe(first);
    const republished = await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/publish`)
      .set('Authorization', auth)
      .expect(201);
    expect(republished.body.firstPublishedAt).toBe(first);
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/unpublish`)
      .set('Authorization', auth)
      .expect(201);
    await request(app.getHttpServer()).get('/api/v1/articles/ciclo-f4?locale=es').expect(404);
    const republished2 = await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/publish`)
      .set('Authorization', auth)
      .expect(201);
    expect(republished2.body.firstPublishedAt).toBe(first);
    await request(app.getHttpServer())
      .delete(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .expect(204);
  });

  it('archives/restores and rejects illegal transitions with 409', async () => {
    const at = await token();
    const auth = `Bearer ${at}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', `Bearer ${at}`)
      .send({ categoryId: ids.category, translations: [{ ...ES, slug: 'ciclo-arch' }] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/archive`)
      .set('Authorization', auth)
      .expect(201);
    const direct = await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/publish`)
      .set('Authorization', auth)
      .expect(409);
    expect(direct.body.code).toBe('invalid_transition');
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/restore`)
      .set('Authorization', auth)
      .expect(201);
    const restored = await request(app.getHttpServer())
      .get(`/api/v1/editorial/articles/${id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(restored.body).toMatchObject({ status: 'draft' });
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/restore`)
      .set('Authorization', auth)
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .expect(204);
  });

  it('supports review via PATCH only from draft', async () => {
    const at = await token();
    const auth = `Bearer ${at}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', `Bearer ${at}`)
      .send({ categoryId: ids.category, translations: [{ ...ES, slug: 'ciclo-rev' }] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    const published = await request(app.getHttpServer())
      .post(`/api/v1/articles/${id}/publish`)
      .set('Authorization', auth)
      .expect(201);
    expect(published.body).toMatchObject({ status: 'published' });
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/api/v1/articles/${id}`)
      .set('Authorization', auth)
      .expect(204);
  });

  it('cycles opinions through publish/unpublish', async () => {
    const at = await token();
    const auth = `Bearer ${at}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/opinions')
      .set('Authorization', `Bearer ${at}`)
      .send({ authorId: ids.author, translations: [{ ...ES, slug: 'op-ciclo' }] })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/opinions/${id}/publish`)
      .set('Authorization', auth)
      .expect(201);
    await request(app.getHttpServer()).get('/api/v1/opinions/op-ciclo?locale=es').expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/opinions/${id}/unpublish`)
      .set('Authorization', auth)
      .expect(201);
    await request(app.getHttpServer()).get('/api/v1/opinions/op-ciclo?locale=es').expect(404);
    // Idempotent: already draft.
    await request(app.getHttpServer())
      .post(`/api/v1/opinions/${id}/unpublish`)
      .set('Authorization', auth)
      .expect(201);
    await request(app.getHttpServer())
      .delete(`/api/v1/opinions/${id}`)
      .set('Authorization', auth)
      .expect(204);
  });

  it('requires auth on transition endpoints', async () => {
    await request(app.getHttpServer()).post('/api/v1/articles/00000000-0000-0000-0000-000000000000/publish').expect(401);
  });
});
