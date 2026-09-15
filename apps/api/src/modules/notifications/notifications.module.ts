import { Module } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

/**
 * In-app notifications. Depends on nothing domain-specific (only the
 * global PrismaService), so content modules can depend on it without
 * cycles; Articles/Opinions/Scheduling import it for event fan-out.
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsRepository, NotificationsService],
  exports: [NotificationsRepository, NotificationsService],
})
export class NotificationsModule {}
