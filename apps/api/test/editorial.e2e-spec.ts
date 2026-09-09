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
    'TRUNCATE "users", "authors", "categories", "articles", "opinions", "media_assets", "user_credentials", "refresh_tokens" RESTART IDENTITY CASCADE',
  );
  const admin = await prisma.user.create({
    data: { email: 'admin@newshub.local', displayName: 'Admin', role: 'admin' },
  });
  const editor = await prisma.user.create({
    data: { email: 'editor@newshub.local', displayName: 'Editor', role: 'editor' },
  });
  await prisma.userCredential.create({
    data: { userId: admin.id, passwordHash: await hashPassword('Admin123!') },
  });
  await prisma.userCredential.create({
    data: { userId: editor.id, passwordHash: await hashPassword('Editor123!') },
  });
  const staff = await prisma.author.create({ data: { slug: 'redaccion' } });
  await prisma.authorTranslation.create({
    data: { authorId: staff.id, locale: 'es', name: 'Redacción', bio: null },
  });
  const category = await prisma.category.create({
    data: { sort: 0, createdById: admin.id, updatedById: admin.id },
  });
  await prisma.categoryTranslation.create({
    data: { categoryId: category.id, locale: 'es', slug: 'politica', label: 'Política', description: 'Desc.' },
  });
  const publishedAt = new Date('2025-10-04T12:00:00.000Z');
  const article = await prisma.article.create({
    data: {
      categoryId: category.id, status: 'published', publishedAt,
      createdAt: publishedAt, createdById: admin.id, updatedById: admin.id,
    },
  });
  await prisma.articleTranslation.create({
    data: {
      articleId: article.id, locale: 'es', slug: 'articulo', title: 'Título',
      summary: 'Resumen', coverAlt: 'Alt', content: ['Texto.'],
    },
  });
  const opinion = await prisma.opinion.create({
    data: {
      authorId: staff.id, status: 'published', publishedAt,
      createdAt: publishedAt, createdById: admin.id, updatedById: admin.id,
    },
  });
  await prisma.opinionTranslation.create({
    data: {
      opinionId: opinion.id, locale: 'es', slug: 'opinion', title: 'Opinión',
      summary: 'Resumen', coverAlt: 'Alt', content: ['Texto.'],
    },
  });
}

describe('F2 editorial (e2e)', () => {
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

  function loginAs(email: string, password: string) {
    return request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password });
  }

  function cookies(res: { headers: Record<string, string | string[] | undefined> }): string {
    const raw = res.headers['set-cookie'];
    return Array.isArray(raw) ? raw.join(';') : (raw ?? '');
  }

  it('logs in the seeded editor with cookie + token', async () => {
    const res = await loginAs('editor@newshub.local', 'Editor123!').expect(200);
    expect(res.body.user).toMatchObject({ email: 'editor@newshub.local', role: 'editor' });
    expect(res.body.accessToken).toBeDefined();
    expect(cookies(res)).toContain('nh_refresh');
    expect(cookies(res)).toContain('HttpOnly');
  });

  it('rejects wrong passwords without distinguishing cause', async () => {
    const res = await loginAs('editor@newshub.local', 'wrongpass1').expect(401);
    expect(res.body.code).toBe('unauthorized');
    await loginAs('nobody@newshub.local', 'Editor123!').expect(401);
  });

  it('rotates refresh tokens and burns the family on reuse', async () => {
    const first = await loginAs('editor@newshub.local', 'Editor123!').expect(200);
    const rt = /nh_refresh=([^;]+)/.exec(cookies(first))?.[1] ?? '';
    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `nh_refresh=${rt}`)
      .expect(200);
    expect(rotated.body.accessToken).toBeDefined();
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `nh_refresh=${rt}`)
      .expect(401);
    const fresh = /nh_refresh=([^;]+)/.exec(cookies(rotated))?.[1] ?? '';
    const burned = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `nh_refresh=${fresh}`)
      .expect(401);
    expect(burned.body.code).toBe('unauthorized');
  });

  it('revokes on logout', async () => {
    const first = await loginAs('admin@newshub.local', 'Admin123!').expect(200);
    const rt = /nh_refresh=([^;]+)/.exec(cookies(first))?.[1] ?? '';
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', `nh_refresh=${rt}`)
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `nh_refresh=${rt}`)
      .expect(401);
  });

  it('serves /me with a valid token and 401 without', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    const login = await loginAs('admin@newshub.local', 'Admin123!').expect(200);
    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({ email: 'admin@newshub.local', role: 'admin' });
    expect(me.body).not.toHaveProperty('passwordHash');
  });

  it('blocks anonymous writes with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .send({ translations: [{ locale: 'es', slug: 'anon', label: 'Anon' }] })
      .expect(401);
  });

  it('runs the category lifecycle with 409/422 guards', async () => {
    const login = await loginAs('editor@newshub.local', 'Editor123!').expect(200);
    const auth = `Bearer ${login.body.accessToken}`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/categories?locale=es')
      .set('Authorization', auth)
      .send({ sort: 9, translations: [
        { locale: 'es', slug: 'cultura', label: 'Cultura', description: 'Desc.' },
        { locale: 'en', slug: 'culture', label: 'Culture' },
      ] })
      .expect(201);
    expect(created.body).toMatchObject({ slug: 'cultura', label: 'Cultura' });
    const dup = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', auth)
      .send({ translations: [{ locale: 'es', slug: 'cultura', label: 'Dup' }] })
      .expect(409);
    expect(dup.body.code).toBe('slug_taken');
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', auth)
      .send({ translations: [{ locale: 'en', slug: 'only-en', label: 'Only' }] })
      .expect(422);
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', auth)
      .send({ translations: [{ locale: 'es', slug: 'x', label: 'X' }] })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/v1/categories/${created.body.id}?locale=es`)
      .set('Authorization', auth)
      .send({ sort: 3 })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/categories/${created.body.id}`)
      .set('Authorization', auth)
      .expect(204);
    const used = await request(app.getHttpServer())
      .get('/api/v1/categories?locale=es')
      .expect(200);
    const blocked = await request(app.getHttpServer())
      .delete(`/api/v1/categories/${used.body.data[0].id}`)
      .set('Authorization', auth)
      .expect(409);
    expect(blocked.body.code).toBe('conflict');
  });

  it('runs the author lifecycle with referential guards', async () => {
    const login = await loginAs('admin@newshub.local', 'Admin123!').expect(200);
    const auth = `Bearer ${login.body.accessToken}`;
    const before = await request(app.getHttpServer())
      .get('/api/v1/authors')
      .set('Authorization', auth)
      .expect(200);
    expect(before.body.map((a: { slug: string }) => a.slug)).toContain('redaccion');
    await request(app.getHttpServer()).get('/api/v1/authors').expect(401);
    const created = await request(app.getHttpServer())
      .post('/api/v1/authors')
      .set('Authorization', auth)
      .send({ slug: 'cronista', translations: [{ locale: 'es', name: 'Cronista' }] })
      .expect(201);
    expect(created.body).toMatchObject({ slug: 'cronista' });
    const dup = await request(app.getHttpServer())
      .post('/api/v1/authors')
      .set('Authorization', auth)
      .send({ slug: 'cronista', translations: [{ locale: 'es', name: 'Dup' }] })
      .expect(409);
    expect(dup.body.code).toBe('slug_taken');
    await request(app.getHttpServer())
      .delete(`/api/v1/authors/${created.body.id}`)
      .set('Authorization', auth)
      .expect(204);
    const staff = await prisma.author.findUniqueOrThrow({ where: { slug: 'redaccion' } });
    await request(app.getHttpServer())
      .delete(`/api/v1/authors/${staff.id}`)
      .set('Authorization', auth)
      .expect(409);
  });

  it('lists all categories editorially, including empty ones', async () => {
    const login = await loginAs('editor@newshub.local', 'Editor123!').expect(200);
    const auth = `Bearer ${login.body.accessToken}`;
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', auth)
      .send({ translations: [{ locale: 'es', slug: 'vacia', label: 'Vacia' }] })
      .expect(201);
    const list = await request(app.getHttpServer())
      .get('/api/v1/editorial/categories?locale=es')
      .set('Authorization', auth)
      .expect(200);
    expect(list.body.meta.total).toBe(2);
    expect(list.body.data.map((c: { slug: string }) => c.slug).sort()).toEqual(['politica', 'vacia']);
    await request(app.getHttpServer()).get('/api/v1/editorial/categories?locale=es').expect(401);
    const created = list.body.data.find((c: { slug: string }) => c.slug === 'vacia') as { id: string };
    await request(app.getHttpServer())
      .delete(`/api/v1/categories/${created.id}`)
      .set('Authorization', auth)
      .expect(204);
  });
});
