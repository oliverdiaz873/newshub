import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesRepository } from './articles.repository';
import { ArticlesService } from './articles.service';
import { AuthorsModule } from '../authors/authors.module';
import { CategoriesModule } from '../categories/categories.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [AuthorsModule, CategoriesModule, MediaModule],
  controllers: [ArticlesController],
  providers: [ArticlesRepository, ArticlesService],
  exports: [ArticlesRepository, ArticlesService],
})
export class ArticlesModule {}
