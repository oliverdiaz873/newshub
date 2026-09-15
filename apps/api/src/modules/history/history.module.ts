import { Module } from '@nestjs/common';
import { RevisionRepository } from './revision.repository';
import { AuditRepository } from './audit.repository';
import { RevisionsService } from './revisions.service';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

/**
 * Content history + immutable audit trail. Imports nothing domain-specific
 * (only the global PrismaService), so Articles/Opinions/Media/Auth can
 * depend on it without cycles.
 */
@Module({
  controllers: [AuditController],
  providers: [RevisionRepository, AuditRepository, RevisionsService, AuditService],
  exports: [RevisionRepository, AuditRepository, RevisionsService, AuditService],
})
export class HistoryModule {}
