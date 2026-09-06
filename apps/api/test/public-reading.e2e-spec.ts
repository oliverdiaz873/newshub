import 'dotenv/config';
import { execSync } from 'node:child_process';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { ProblemExceptionFilter } from '../src/common/http/problem.filter';
import { CacheControlInterceptor } from '../src/common/http/cache-control.interceptor';

const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('TEST_DATABASE_URL is required for e2e.');

const prisma = new PrismaClient({ datasourceUrl: TEST_URL });

async function fixture() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "users", "authors", "categories", "articles", "opinions", "media_assets" RESTART IDENTITY CASCADE',
  );
  const admin = await prisma.user.create({
    data: { email: 'admin@newshub.local', displayName: 'Admin', role: 'admin' },
  });
  const staff = await prisma.author.create({ data: { slug: 'redaccion' } });
  await prisma.authorTranslation.create({
    data: { authorId: staff.id, locale: 'es', name: 'Redacción', bio: null },
  });
  const media = await prisma.mediaAsset.create({
    data: { storageKey: '/images/news/politica/congreso.avif', mime: 'image/avif', createdById: admin.id },
  });
  const category = await prisma.category.create({
    data: { sort: 0, createdById: admin.id, updatedById: admin.id },
  });
  await prisma.categoryTranslation.create({
    data: { categoryId: category.id, locale: 'es', slug: 'politica', label: 'Política', description: 'Desc.' },
  });
  const publishedAt = new Date('2025-10-04T12:00:00.000Z');
  const both = await prisma.article.create({
    data: {
      categoryId: category.id, coverMediaId: media.id, status: 'published',
      publishedAt, createdAt: publishedAt, createdById: admin.id, updatedById: admin.id,
    },
  });
  await prisma.articleTranslation.create({
    data: {
      articleId: both.id, locale: 'es', slug: 'articulo-es', title: 'Título ES único',
      summary: 'Resumen ES', coverAlt: 'Alt ES', content: ['Párrafo uno.'],
    },
  });
  await prisma.articleTranslation.create({
    data: {
      articleId: both.id, locale: 'en', slug: 'english-article', title: 'Unique EN title',
      summary: 'EN summary', coverAlt: 'EN alt', content: ['Paragraph one.'],
    },
  });
  const spanishOnly = await prisma.article.create({
    data: {
      categoryId: category.id, coverMediaId: media.id, status: 'published',
      publishedAt, createdAt: publishedAt, createdById: admin.id, updatedById: admin.id,
    },
  });
  await prisma.articleTranslation.create({
    data: {
      articleId: spanishOnly.id, locale: 'es', slug: 'solo-espanol', title: 'Solo español',
      summary: 'Resumen', coverAlt: 'Alt', content: ['Texto.'],
    },
  });
  await prisma.article.create({
    data: {
      categoryId: category.id, status: 'draft',
      createdAt: publishedAt, createdById: admin.id, updatedById: admin.id,
    },
  });
  const opinion = await prisma.opinion.create({
    data: {
      authorId: staff.id, coverMediaId: media.id, status: 'published',
      publishedAt, createdAt: publishedAt, createdById: admin.id, updatedById: admin.id,
    },
  });
  await prisma.opinionTranslation.create({
    data: {
      opinionId: opinion.id, locale: 'es', slug: 'opinion-test', title: 'Opinión test',
      summary: 'Resumen opinión', coverAlt: 'Alt', content: ['Columna.'],
    },
  });
}

describe('F1 public reading (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Route the app's PrismaClient at the test database before it is constructed.
    process.env.DATABASE_URL = TEST_URL;
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_URL },
      stdio: 'pipe',
    });
    await fixture();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
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

  it('GET /health', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('lists articles with pagination meta, published only', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/articles?locale=es&page=1&limit=20')
      .expect(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 2, totalPages: 1 });
    expect(res.body.localeResolved).toBe('es');
    expect(res.headers['etag']).toBeDefined();
    expect(res.headers['cache-control']).toContain('s-maxage=60');
  });

  it('resolves EN detail without fallback when translated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/articles/english-article?locale=en')
      .expect(200);
    expect(res.body).toMatchObject({ localeResolved: 'en', fallback: false, title: 'Unique EN title' });
    expect(res.body.breadcrumb).toBeDefined();
    expect(Array.isArray(res.body.content)).toBe(true);
  });

  it('falls back to ES with flag when EN is missing', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/articles/solo-espanol?locale=en')
      .expect(200);
    expect(res.body).toMatchObject({ localeResolved: 'es', fallback: true });
  });

  it('returns stable 404 envelope for unknown slugs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/articles/no-existe?locale=es')
      .expect(404);
    expect(res.body.code).toBe('not_found');
  });

  it('rejects invalid pagination with validation envelope', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/articles?locale=es&limit=999')
      .expect(400);
    expect(res.body.code).toBe('validation_failed');
  });

  it('lists categories and resolves detail with articleCount', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/categories?locale=es')
      .expect(200);
    expect(list.body.meta.total).toBe(1);
    const detail = await request(app.getHttpServer())
      .get('/api/v1/categories/politica?locale=es')
      .expect(200);
    expect(detail.body).toMatchObject({ label: 'Política', articleCount: 2 });
  });

  it('lists opinions with embedded author', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/opinions?locale=es')
      .expect(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].author).toMatchObject({ slug: 'redaccion', name: 'Redacción' });
  });

  it('filters by q and category', async () => {
    const q = await request(app.getHttpServer())
      .get('/api/v1/articles?locale=es&q=T%C3%ADtulo%20ES%20%C3%BAnico')
      .expect(200);
    expect(q.body.meta.total).toBe(1);
    const cat = await request(app.getHttpServer())
      .get('/api/v1/articles?locale=es&category=politica')
      .expect(200);
    expect(cat.body.meta.total).toBe(2);
  });
});
