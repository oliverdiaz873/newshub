import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { OpinionsModule } from './modules/opinions/opinions.module';
import { AuthorsModule } from './modules/authors/authors.module';

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, CategoriesModule, ArticlesModule, OpinionsModule, AuthorsModule],
})
export class AppModule {}
