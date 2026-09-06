import 'reflect-metadata';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ProblemExceptionFilter } from './common/http/problem.filter';
import { CacheControlInterceptor } from './common/http/cache-control.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new ProblemExceptionFilter());
  app.useGlobalInterceptors(new CacheControlInterceptor());
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}

void bootstrap().catch((err) => console.error(err));
