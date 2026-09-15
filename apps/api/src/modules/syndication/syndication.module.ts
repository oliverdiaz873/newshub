import { Module } from '@nestjs/common';
import { SyndicationController, WebhooksController } from './syndication.controller';
import { SyndicationRepository } from './syndication.repository';
import { SyndicationService } from './syndication.service';
import { HistoryModule } from '../history/history.module';

/**
 * Syndication (Increment 10): public RSS feeds + admin-managed outbound
 * webhooks. Depends only on History (audit) plus the global PrismaService,
 * so content modules can depend on it for fan-out without cycles.
 */
@Module({
  imports: [HistoryModule],
  controllers: [SyndicationController, WebhooksController],
  providers: [SyndicationRepository, SyndicationService],
  exports: [SyndicationRepository, SyndicationService],
})
export class SyndicationModule {}
