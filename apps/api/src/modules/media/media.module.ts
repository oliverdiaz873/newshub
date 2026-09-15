import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaRepository } from './media.repository';
import { MediaService } from './media.service';
import { HistoryModule } from '../history/history.module';

@Module({
  imports: [HistoryModule],
  controllers: [MediaController],
  providers: [MediaRepository, MediaService],
  exports: [MediaRepository, MediaService],
})
export class MediaModule {}
