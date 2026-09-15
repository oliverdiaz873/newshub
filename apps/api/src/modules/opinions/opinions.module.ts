import { Module } from '@nestjs/common';
import { OpinionsController } from './opinions.controller';
import { OpinionsRepository } from './opinions.repository';
import { OpinionsService } from './opinions.service';
import { AuthorsModule } from '../authors/authors.module';
import { MediaModule } from '../media/media.module';
import { HistoryModule } from '../history/history.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SyndicationModule } from '../syndication/syndication.module';

@Module({
  imports: [AuthorsModule, MediaModule, HistoryModule, NotificationsModule, SyndicationModule],
  controllers: [OpinionsController],
  providers: [OpinionsRepository, OpinionsService],
  exports: [OpinionsRepository, OpinionsService],
})
export class OpinionsModule {}
