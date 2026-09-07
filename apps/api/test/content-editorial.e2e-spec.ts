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
  slug: 'nota-f3',
  title: 'Nota F3 con titulo suficiente',
  summary: 'Resumen suficientemente largo para la validacion.',
  content: ['Parrafo uno.', 'Parrafo dos.'],
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

describe('F3 content editorial (e2e)', () => {
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

  it('creates drafts invisible to the public surface', async () => {
    const at = await token();
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', `Bearer ${at}`)
      .send({ categoryId: ids.category, authorId: ids.author, translations: [ES] })
      .expect(201);
    expect(created.body).toMatchObject({ status: 'draft', firstPublishedAt: null });
    expect(created.body.translations).toHaveLength(1);
    await request(app.getHttpServer()).get('/api/v1/articles/nota-f3?locale=es').expect(404);
    const list = await request(app.getHttpServer()).get('/api/v1/articles?locale=es').expect(200);
    expect(list.body.meta.total).toBe(0);
    const audit = await prisma.article.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(audit.createdById).toBe(ids.editor);
    expect(audit.updatedById).toBe(ids.editor);
    const ed = await request(app.getHttpServer())
      .get('/api/v1/editorial/articles?status=draft')
      .set('Authorization', `Bearer ${at}`)
      .expect(200);
    expect(ed.body.meta.total).toBe(1);
    expect(ed.body.data[0]).toMatchObject({ status: 'draft' });
  });

  it('enforces slug uniqueness, ES requirement and draft-only status', async () => {
    const at = await token();
    const dup = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', `Bearer ${at}`)
      .send({ categoryId: ids.category, translations: [ES] })
      .expect(409);
    expect(dup.body.code).toBe('slug_taken');
    await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', `Bearer ${at}`)
      .send({ categoryId: ids.category, translations: [{ ...ES, locale: 'en', slug: 'en-only' }] })
      .expect(422);
    await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', `Bearer ${at}`)
      .send({ categoryId: ids.category, status: 'published', translations: [ES] })
      .expect(422);
    await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', `Bearer ${at}`)
      .send({ categoryId: '00000000-0000-0000-0000-000000000000', translations: [ES] })
      .expect(404);
    await request(app.getHttpServer())
      .post('/api/v1/articles')
      .send({ categoryId: ids.category, translations: [ES] })
      .expect(401);
  });

  it('patches translations partially and deletes', async () => {
    const at = await token();
    const slug = { ...ES, slug: 'nota-f3b' };
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', `Bearer ${at}`)
      .send({ categoryId: ids.category, translations: [slug] })
      .expect(201);
    const id = created.body.id as string;
    const patched = await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', `Bearer ${at}`)
      .send({ translations: [{ ...ES, locale: 'en', slug: 'nota-f3-en' }] })
      .expect(200);
    expect(patched.body.translations).toHaveLength(2);
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set('Authorization', `Bearer ${at}`)
      .send({ status: 'published' })
      .expect(422);
    await request(app.getHttpServer())
      .delete(`/api/v1/articles/${id}`)
      .set('Authorization', `Bearer ${at}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/v1/editorial/articles/${id}`)
      .set('Authorization', `Bearer ${at}`)
      .expect(404);
  });

  it('runs the opinion lifecycle with required author', async () => {
    const at = await token();
    await request(app.getHttpServer())
      .post('/api/v1/opinions')
      .set('Authorization', `Bearer ${at}`)
      .send({ translations: [{ ...ES, slug: 'op-f3' }] })
      .expect(400);
    const created = await request(app.getHttpServer())
      .post('/api/v1/opinions')
      .set('Authorization', `Bearer ${at}`)
      .send({ authorId: ids.author, translations: [{ ...ES, slug: 'op-f3' }] })
      .expect(201);
    expect(created.body).toMatchObject({ status: 'draft', authorId: ids.author });
    await request(app.getHttpServer()).get('/api/v1/opinions/op-f3?locale=es').expect(404);
    const read = await request(app.getHttpServer())
      .get(`/api/v1/editorial/opinions/${created.body.id}`)
      .set('Authorization', `Bearer ${at}`)
      .expect(200);
    expect(read.body.translations).toHaveLength(1);
    await request(app.getHttpServer())
      .delete(`/api/v1/opinions/${created.body.id}`)
      .set('Authorization', `Bearer ${at}`)
      .expect(204);
  });
});
