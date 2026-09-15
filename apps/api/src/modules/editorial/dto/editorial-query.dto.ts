import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { ArticlesQueryDto, OpinionsQueryDto } from '../../../common/dto/list-query.dto';

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
};

export const ARTICLE_STATUSES = ['draft', 'review', 'published', 'archived'] as const;

export class EditorialArticlesQueryDto extends ArticlesQueryDto {
  @IsOptional()
  @IsIn([...ARTICLE_STATUSES])
  status?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  scheduled?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  overdue?: boolean;
}

export class EditorialOpinionsQueryDto extends OpinionsQueryDto {
  @IsOptional()
  @IsIn([...ARTICLE_STATUSES])
  status?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  scheduled?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  overdue?: boolean;
}
