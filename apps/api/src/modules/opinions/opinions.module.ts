import { Module } from '@nestjs/common';
import { OpinionsController } from './opinions.controller';
import { OpinionsRepository } from './opinions.repository';
import { OpinionsService } from './opinions.service';
import { AuthorsModule } from '../authors/authors.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [AuthorsModule, MediaModule],
  controllers: [OpinionsController],
  providers: [OpinionsRepository, OpinionsService],
  exports: [OpinionsRepository, OpinionsService],
})
export class OpinionsModule {}
