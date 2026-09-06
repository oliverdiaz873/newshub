import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/pagination';

const toInt = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? value : parsed;
};

export class ListQueryDto {
  @IsOptional()
  @IsIn(['es', 'en'])
  locale?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;
}

export class ArticlesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['publishedAt:desc', 'publishedAt:asc'])
  sort?: 'publishedAt:desc' | 'publishedAt:asc';
}

export class OpinionsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
