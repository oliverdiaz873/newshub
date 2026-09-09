import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { EditorialModule } from './modules/editorial/editorial.module';
import { MediaModule } from './modules/media/media.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { OpinionsModule } from './modules/opinions/opinions.module';
import { AuthorsModule } from './modules/authors/authors.module';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => [{ name: 'default', ttl: 60000, limit: defaultThrottleLimit() }],
    }),
    PrismaModule, HealthModule, AuthModule, EditorialModule, MediaModule, CategoriesModule, ArticlesModule, OpinionsModule, AuthorsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

/**
 * H4 global rate limit (per IP, per route). 1000 req/min keeps normal use
 * and the E2E suites far from the ceiling; strict per-route overrides
 * (login 10/min, refresh 20/min) still win. Overridable for tests via
 * THROTTLE_DEFAULT_LIMIT. No trust-proxy: client IP is the direct TCP
 * peer until the real proxy topology is known (see PR notes).
 */
function defaultThrottleLimit(): number {
  const raw = Number.parseInt(process.env.THROTTLE_DEFAULT_LIMIT ?? '', 10);
  return Number.isInteger(raw) && raw > 0 ? raw : 1000;
}
