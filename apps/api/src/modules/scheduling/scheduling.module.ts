import { Module } from '@nestjs/common';
import { ArticlesModule } from '../articles/articles.module';
import { OpinionsModule } from '../opinions/opinions.module';
import { SchedulingService } from './scheduling.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlanningModule } from '../planning/planning.module';
import { SyndicationModule } from '../syndication/syndication.module';

@Module({
  imports: [ArticlesModule, OpinionsModule, NotificationsModule, PlanningModule, SyndicationModule],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
