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
  // Dashboard runs on another origin in dev (different port, same site for
  // cookies). Production allowlist stays open (hosting decision).
  app.enableCors({
    origin: process.env.DASHBOARD_URL ?? 'http://localhost:3002',
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
