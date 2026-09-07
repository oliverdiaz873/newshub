import { IsIn, IsOptional } from 'class-validator';
import { ArticlesQueryDto, OpinionsQueryDto } from '../../../common/dto/list-query.dto';

export const ARTICLE_STATUSES = ['draft', 'review', 'published', 'archived'] as const;

export class EditorialArticlesQueryDto extends ArticlesQueryDto {
  @IsOptional()
  @IsIn([...ARTICLE_STATUSES])
  status?: string;
}

export class EditorialOpinionsQueryDto extends OpinionsQueryDto {
  @IsOptional()
  @IsIn([...ARTICLE_STATUSES])
  status?: string;
}
