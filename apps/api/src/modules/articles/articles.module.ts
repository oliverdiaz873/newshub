import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesRepository } from './articles.repository';
import { ArticlesService } from './articles.service';
import { AuthorsModule } from '../authors/authors.module';
import { CategoriesModule } from '../categories/categories.module';
import { MediaModule } from '../media/media.module';
import { HistoryModule } from '../history/history.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SyndicationModule } from '../syndication/syndication.module';

@Module({
  imports: [AuthorsModule, CategoriesModule, MediaModule, HistoryModule, NotificationsModule, SyndicationModule],
  controllers: [ArticlesController],
  providers: [ArticlesRepository, ArticlesService],
  exports: [ArticlesRepository, ArticlesService],
})
export class ArticlesModule {}
