import { Module } from '@nestjs/common';
import { EditorialController } from './editorial.controller';
import { ArticlesModule } from '../articles/articles.module';
import { OpinionsModule } from '../opinions/opinions.module';

@Module({
  imports: [ArticlesModule, OpinionsModule],
  controllers: [EditorialController],
})
export class EditorialModule {}
