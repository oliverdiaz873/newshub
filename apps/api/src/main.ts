import 'reflect-metadata';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ProblemExceptionFilter } from './common/http/problem.filter';
import { CacheControlInterceptor } from './common/http/cache-control.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());
  // Storefront and Dashboard are both first-party browser clients of
  // this API (ADR-012). CORS allows exactly these two origins, each
  // falling back to its local dev default when unset. Production must
  // set both explicitly (see .env.example) — no wildcard origins.
  const dashboardOrigin = (process.env.DASHBOARD_URL ?? 'http://localhost:3212').trim();
  const storefrontOrigin = (process.env.STOREFRONT_URL ?? 'http://localhost:3000').trim();
  const allowedOrigins = [dashboardOrigin, storefrontOrigin].filter((o) => o.length > 0);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new ProblemExceptionFilter());
  app.useGlobalInterceptors(new CacheControlInterceptor());
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}

void bootstrap().catch((err) => console.error(err));
