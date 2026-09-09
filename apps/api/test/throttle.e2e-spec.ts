import 'dotenv/config';
import { execSync } from 'node:child_process';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ProblemExceptionFilter } from '../src/common/http/problem.filter';

// Controlled global limit for this file: proves the APP_GUARD is active
// without firing 1000 requests. Buckets are per-route (Class-Handler-IP),
// so the three cases below are independent of each other. Saved/restored
// here because jest --runInBand shares process.env across spec files.
const PREV_LIMIT = process.env.THROTTLE_DEFAULT_LIMIT;

const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('TEST_DATABASE_URL is required for e2e.');

describe('H4 global rate limit (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.THROTTLE_DEFAULT_LIMIT = '5';
    process.env.DATABASE_URL = TEST_URL;
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_URL },
      stdio: 'pipe',
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new ProblemExceptionFilter());
    await app.init();
  }, 120000);

  afterAll(async () => {
    await app.close();
    if (PREV_LIMIT === undefined) delete process.env.THROTTLE_DEFAULT_LIMIT;
    else process.env.THROTTLE_DEFAULT_LIMIT = PREV_LIMIT;
  });

  it('leaves /health unthrottled (probes must never 429)', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    }
  });

  it('429s a public route past the global limit in Problem JSON', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).get('/api/v1/categories?locale=es').expect(200);
    }
    const res = await request(app.getHttpServer()).get('/api/v1/categories?locale=es').expect(429);
    expect(res.body).toMatchObject({ status: 429, code: 'rate_limited' });
    expect(res.body.type).toContain('/problems/rate-limited');
  });

  it('keeps the strict login override (11th attempt 429s)', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@newshub.local', password: 'wrongpass1' })
        .expect(401);
    }
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@newshub.local', password: 'wrongpass1' })
      .expect(429);
    expect(res.body).toMatchObject({ status: 429, code: 'rate_limited' });
  });
});
