import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningRepository } from './planning.repository';
import { PlanningService } from './planning.service';
import { CategoriesModule } from '../categories/categories.module';
import { HistoryModule } from '../history/history.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ArticlesModule } from '../articles/articles.module';
import { OpinionsModule } from '../opinions/opinions.module';

@Module({
  imports: [CategoriesModule, HistoryModule, NotificationsModule, ArticlesModule, OpinionsModule],
  controllers: [PlanningController],
  providers: [PlanningRepository, PlanningService],
  exports: [PlanningRepository, PlanningService],
})
export class PlanningModule {}
