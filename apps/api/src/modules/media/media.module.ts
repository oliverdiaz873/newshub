import { Module } from '@nestjs/common';
import { MediaRepository } from './media.repository';

@Module({
  providers: [MediaRepository],
  exports: [MediaRepository],
})
export class MediaModule {}
