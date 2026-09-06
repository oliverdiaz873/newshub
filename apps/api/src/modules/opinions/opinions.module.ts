import { Module } from '@nestjs/common';
import { OpinionsController } from './opinions.controller';
import { OpinionsRepository } from './opinions.repository';
import { OpinionsService } from './opinions.service';
import { AuthorsModule } from '../authors/authors.module';

@Module({
  imports: [AuthorsModule],
  controllers: [OpinionsController],
  providers: [OpinionsRepository, OpinionsService],
})
export class OpinionsModule {}
