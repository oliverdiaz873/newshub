import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesRepository } from './articles.repository';
import { ArticlesService } from './articles.service';
import { AuthorsModule } from '../authors/authors.module';

@Module({
  imports: [AuthorsModule],
  controllers: [ArticlesController],
  providers: [ArticlesRepository, ArticlesService],
})
export class ArticlesModule {}
