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
  const older = new Date('2025-10-04T12:00:00.000Z');
  const newer = new Date('2025-10-11T12:00:00.000Z');
  const econ = await prisma.article.create({
    data: {
      categoryId: category.id, coverMediaId: media.id, status: 'published',
      publishedAt: older, createdAt: older, createdById: admin.id, updatedById: admin.id,
    },
  });
  await prisma.articleTranslation.create({
    data: {
      articleId: econ.id, locale: 'es', slug: 'acc-economia', title: 'Economía global en alza',
      summary: 'Resumen economía.', coverAlt: 'Alt', content: ['Texto.'],
    },
  });
  await prisma.articleTranslation.create({
    data: {
      articleId: econ.id, locale: 'en', slug: 'acc-economy', title: 'Global economy rising',
      summary: 'EN summary', coverAlt: 'EN alt', content: ['Paragraph.'],
    },
  });
  const pol = await prisma.article.create({
    data: {
      categoryId: category.id, coverMediaId: media.id, status: 'published',
      publishedAt: newer, createdAt: newer, createdById: admin.id, updatedById: admin.id,
    },
  });
  await prisma.articleTranslation.create({
    data: {
      articleId: pol.id, locale: 'es', slug: 'acc-politica', title: 'Política local transparente',
      summary: 'Los niños participan.', coverAlt: 'Alt', content: ['Texto.'],
    },
  });
  await prisma.article.create({
    data: {
      categoryId: category.id, status: 'draft',
      createdAt: older, createdById: admin.id, updatedById: admin.id,
    },
  }).then(async (draft) => {
    await prisma.articleTranslation.create({
      data: {
        articleId: draft.id, locale: 'es', slug: 'acc-borrador', title: 'Economía en borrador',
        summary: 'Resumen', coverAlt: 'Alt', content: ['Texto.'],
      },
    });
  });
  const opinion = await prisma.opinion.create({
    data: {
      authorId: staff.id, coverMediaId: media.id, status: 'published',
      publishedAt: older, createdAt: older, createdById: admin.id, updatedById: admin.id,
    },
  });
  await prisma.opinionTranslation.create({
    data: {
      opinionId: opinion.id, locale: 'es', slug: 'acc-opinion', title: 'Opinión sobre política fiscal',
      summary: 'Resumen opinión', coverAlt: 'Alt', content: ['Columna.'],
    },
  });
}

describe('accent-insensitive search (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
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

  const get = (path: string) => request(app.getHttpServer()).get(path).expect(200);

  it('matches economia without accents (articles)', async () => {
    const res = await get(`/api/v1/articles?locale=es&q=${encodeURIComponent('economia')}`);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ slug: 'acc-economia', fallback: false });
  });

  it('keeps case-insensitivity without accents', async () => {
    const res = await get(`/api/v1/articles?locale=es&q=${encodeURIComponent('ECONOMIA')}`);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0]).toMatchObject({ slug: 'acc-economia' });
  });

  it('still matches exact accented queries', async () => {
    const res = await get(`/api/v1/articles?locale=es&q=${encodeURIComponent('Economía')}`);
    expect(res.body.meta.total).toBe(1);
  });

  it('matches politica in articles and opinions', async () => {
    const arts = await get(`/api/v1/articles?locale=es&q=${encodeURIComponent('politica')}`);
    expect(arts.body.meta.total).toBe(1);
    expect(arts.body.data[0]).toMatchObject({ slug: 'acc-politica' });
    const ops = await get(`/api/v1/opinions?locale=es&q=${encodeURIComponent('politica')}`);
    expect(ops.body.meta.total).toBe(1);
    expect(ops.body.data[0]).toMatchObject({ slug: 'acc-opinion' });
  });

  it('keeps ñ distinct from n (no match)', async () => {
    // ñ is a distinct Spanish letter: the fold() guard shields it from
    // unaccent, so `nino` must not match `niños`.
    const res = await get(`/api/v1/articles?locale=es&q=${encodeURIComponent('nino')}`);
    expect(res.body.meta.total).toBe(0);
    expect(res.body.data).toHaveLength(0);
  });

  it('matches niño with its tilde', async () => {
    const res = await get(`/api/v1/articles?locale=es&q=${encodeURIComponent('niño')}`);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0]).toMatchObject({ slug: 'acc-politica' });
  });

  it('excludes drafts from accent matches', async () => {
    const res = await get(`/api/v1/articles?locale=es&q=${encodeURIComponent('borrador')}`);
    expect(res.body.meta.total).toBe(0);
    expect(res.body.data).toHaveLength(0);
  });

  it('keeps total/results/pagination consistent', async () => {
    const res = await get(`/api/v1/articles?locale=es&q=${encodeURIComponent('a')}&page=1&limit=1`);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 1, total: 2, totalPages: 2 });
    expect(res.body.data).toHaveLength(1);
  });

  it('keeps publishedAt ordering with q', async () => {
    const desc = await get(`/api/v1/articles?locale=es&q=${encodeURIComponent('a')}&sort=publishedAt:desc`);
    expect(desc.body.data[0]).toMatchObject({ slug: 'acc-politica' });
    const asc = await get(`/api/v1/articles?locale=es&q=${encodeURIComponent('a')}&sort=publishedAt:asc`);
    expect(asc.body.data[0]).toMatchObject({ slug: 'acc-economia' });
  });

  it('resolves EN matches with locale flags intact', async () => {
    const en = await get(`/api/v1/articles?locale=en&q=${encodeURIComponent('economy')}`);
    expect(en.body.meta.total).toBe(1);
    expect(en.body.data[0]).toMatchObject({ slug: 'acc-economy', fallback: false });
    // acc-politica has no EN translation: matched via ES, flagged fallback.
    const fb = await get(`/api/v1/articles?locale=en&q=${encodeURIComponent('transparente')}`);
    expect(fb.body.meta.total).toBe(1);
    expect(fb.body.data[0]).toMatchObject({ slug: 'acc-politica', fallback: true });
  });

  it('combines q with category filter', async () => {
    const res = await get(`/api/v1/articles?locale=es&q=${encodeURIComponent('economia')}&category=politica`);
    expect(res.body.meta.total).toBe(1);
  });
});
