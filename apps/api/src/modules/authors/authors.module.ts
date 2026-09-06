import { Module } from '@nestjs/common';
import { AuthorsRepository } from './authors.repository';
import { AuthorsService } from './authors.service';

@Module({
  providers: [AuthorsRepository, AuthorsService],
  exports: [AuthorsService],
})
export class AuthorsModule {}
