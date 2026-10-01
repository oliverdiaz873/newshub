import 'dotenv/config';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { ProblemExceptionFilter } from '../src/common/http/problem.filter';
import { CacheControlInterceptor } from '../src/common/http/cache-control.interceptor';
import { hashPassword } from '../src/modules/auth/password';

// 1x1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('TEST_DATABASE_URL is required for e2e.');

const prisma = new PrismaClient({ datasourceUrl: TEST_URL });

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

describe('F5 media (e2e)', () => {
  let app: INestApplication;
  let ids: { category: string; author: string };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL;
    process.env.MEDIA_DIR = process.env.MEDIA_DIR ?? `${tmpdir()}/nh-e2e-media`;
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_URL },
      stdio: 'pipe',
    });
    const f = await fixture();
    ids = { category: f.category.id, author: f.author.id };
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

  it('uploads, serves and deletes with guards', async () => {
    const at = await token();
    const auth = `Bearer ${at}`;
    await request(app.getHttpServer()).post('/api/v1/media').expect(401);
    const up = await request(app.getHttpServer())
      .post('/api/v1/media')
      .set('Authorization', auth)
      .attach('file', PNG, { filename: 'pixel.png', contentType: 'image/png' })
      .expect(201);
    expect(up.body).toMatchObject({ mime: 'image/png', width: 1, height: 1 });
    expect(up.body.url).toContain(`/api/v1/media/${up.body.id}/content`);
    // PR2A contract: original filename + size are persisted and returned.
    expect(up.body).toMatchObject({ originalFilename: 'pixel.png', bytes: PNG.length });
    const listed = await request(app.getHttpServer())
      .get('/api/v1/media?limit=5')
      .set('Authorization', auth)
      .expect(200);
    expect(listed.body.data[0]).toMatchObject({ id: up.body.id, originalFilename: 'pixel.png', bytes: PNG.length });
    const bad = await request(app.getHttpServer())
      .post('/api/v1/media')
      .set('Authorization', auth)
      .attach('file', Buffer.from('not an image'), { filename: 'x.jpg', contentType: 'image/jpeg' })
      .expect(422);
    expect(bad.body.code).toBe('validation_failed');
    const big = await request(app.getHttpServer())
      .post('/api/v1/media')
      .set('Authorization', auth)
      .attach('file', Buffer.alloc(6 * 1024 * 1024, 1), { filename: 'big.jpg', contentType: 'image/jpeg' })
      .expect(413);
    expect(big.body.code).toBe('file_too_large');
    const served = await request(app.getHttpServer())
      .get(`/api/v1/media/${up.body.id}/content`)
      .expect(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(served.headers['cache-control']).toContain('immutable');
    await request(app.getHttpServer()).get('/api/v1/media/00000000-0000-0000-0000-000000000000/content').expect(404);
    await request(app.getHttpServer())
      .delete(`/api/v1/media/${up.body.id}`)
      .set('Authorization', auth)
      .expect(204);
  });

  it('blocks deletion of referenced media and assigns covers', async () => {
    const at = await token();
    const auth = `Bearer ${at}`;
    const up = await request(app.getHttpServer())
      .post('/api/v1/media')
      .set('Authorization', auth)
      .attach('file', PNG, { filename: 'cover.png', contentType: 'image/png' })
      .expect(201);
    const mid = up.body.id as string;
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', auth)
      .send({
        categoryId: ids.category,
        coverMediaId: mid,
        translations: [{
          locale: 'es', slug: 'con-portada', title: 'Con portada titulo largo',
          summary: 'Resumen suficientemente largo aqui.', content: ['Texto.'],
        }],
      })
      .expect(201);
    expect(created.body.coverMediaId).toBe(mid);
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${created.body.id}`)
      .set('Authorization', auth)
      .send({ status: 'review' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/articles/${created.body.id}/publish`)
      .set('Authorization', auth)
      .expect(200);
    const pub = await request(app.getHttpServer())
      .get('/api/v1/articles/con-portada?locale=es')
      .expect(200);
    expect(pub.body.cover.url).toContain(`/api/v1/media/${mid}/content`);
    const blocked = await request(app.getHttpServer())
      .delete(`/api/v1/media/${mid}`)
      .set('Authorization', auth)
      .expect(409);
    expect(blocked.body.code).toBe('media_in_use');
    await request(app.getHttpServer())
      .delete(`/api/v1/articles/${created.body.id}`)
      .set('Authorization', auth)
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/v1/media/${mid}`)
      .set('Authorization', auth)
      .expect(204);
  });

  it('searches by filename or mime with filtered pagination', async () => {
    const at = await token();
    const auth = `Bearer ${at}`;
    const upA = await request(app.getHttpServer())
      .post('/api/v1/media')
      .set('Authorization', auth)
      .attach('file', PNG, { filename: 'pageme-alpha.png', contentType: 'image/png' })
      .expect(201);
    const upB = await request(app.getHttpServer())
      .post('/api/v1/media')
      .set('Authorization', auth)
      .attach('file', PNG, { filename: 'pageme-beta.png', contentType: 'image/png' })
      .expect(201);
    // Historical-style row: NULL filename is only findable via mime.
    const nullRow = await prisma.mediaAsset.create({
      data: { storageKey: `zz/${Date.now()}-null.png`, mime: 'image/png', originalFilename: null, bytes: null },
    });

    // A. partial filename
    const byName = await request(app.getHttpServer())
      .get('/api/v1/media?q=pageme-alpha')
      .set('Authorization', auth)
      .expect(200);
    expect(byName.body.data.map((r: { id: string }) => r.id)).toEqual([upA.body.id]);
    expect(byName.body.meta).toMatchObject({ total: 1, totalPages: 1 });

    // B + C. mime match and case-insensitivity
    const byMime = await request(app.getHttpServer())
      .get('/api/v1/media?q=image/png&limit=100')
      .set('Authorization', auth)
      .expect(200);
    const mimeIds = byMime.body.data.map((r: { id: string }) => r.id);
    expect(mimeIds).toEqual(expect.arrayContaining([upA.body.id, upB.body.id, nullRow.id]));
    const upper = await request(app.getHttpServer())
      .get('/api/v1/media?q=PAGEME-ALPHA')
      .set('Authorization', auth)
      .expect(200);
    expect(upper.body.data.map((r: { id: string }) => r.id)).toEqual([upA.body.id]);

    // D. NULL filename never matches by name
    const noName = await request(app.getHttpServer())
      .get('/api/v1/media?q=pageme')
      .set('Authorization', auth)
      .expect(200);
    expect(noName.body.data.map((r: { id: string }) => r.id)).not.toContain(nullRow.id);

    // E. filtered pagination: totals reflect the search, page 2 holds the older row
    const page2 = await request(app.getHttpServer())
      .get('/api/v1/media?q=pageme&limit=1&page=2')
      .set('Authorization', auth)
      .expect(200);
    expect(page2.body.meta).toMatchObject({ total: 2, totalPages: 2 });
    expect(page2.body.data.map((r: { id: string }) => r.id)).toEqual([upA.body.id]);

    // F. empty q behaves like no filter
    const unfiltered = await request(app.getHttpServer())
      .get('/api/v1/media?limit=100')
      .set('Authorization', auth)
      .expect(200);
    const emptyQ = await request(app.getHttpServer())
      .get('/api/v1/media?limit=100&q=')
      .set('Authorization', auth)
      .expect(200);
    expect(emptyQ.body.meta.total).toBe(unfiltered.body.meta.total);

    // G. unknown q yields empty data with helper-consistent meta
    const unknown = await request(app.getHttpServer())
      .get('/api/v1/media?q=definitely-does-not-exist-123')
      .set('Authorization', auth)
      .expect(200);
    expect(unknown.body.data).toEqual([]);
    expect(unknown.body.meta).toMatchObject({ total: 0, totalPages: 1 });

    await request(app.getHttpServer()).delete(`/api/v1/media/${upA.body.id}`).set('Authorization', auth).expect(204);
    await request(app.getHttpServer()).delete(`/api/v1/media/${upB.body.id}`).set('Authorization', auth).expect(204);
    await prisma.mediaAsset.delete({ where: { id: nullRow.id } });
  });
});
