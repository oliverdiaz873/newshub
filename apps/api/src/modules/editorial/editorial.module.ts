import { Module } from '@nestjs/common';
import { EditorialController } from './editorial.controller';
import { ArticlesModule } from '../articles/articles.module';
import { CategoriesModule } from '../categories/categories.module';
import { OpinionsModule } from '../opinions/opinions.module';

@Module({
  imports: [ArticlesModule, CategoriesModule, OpinionsModule],
  controllers: [EditorialController],
})
export class EditorialModule {}
