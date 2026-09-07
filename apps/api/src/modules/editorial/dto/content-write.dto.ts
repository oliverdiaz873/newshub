import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const CONTENT_SLUG_PATTERN = /^[a-z0-9-]{3,120}$/;

export class ContentTranslationInput {
  @IsIn(['es', 'en'])
  locale!: string;

  @Matches(CONTENT_SLUG_PATTERN)
  slug!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  coverAlt?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  content!: string[];
}

export class CreateArticleDto {
  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsUUID()
  authorId?: string | null;

  @IsOptional()
  @IsUUID()
  coverMediaId?: string | null;

  @IsOptional()
  @IsString()
  status?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContentTranslationInput)
  translations!: ContentTranslationInput[];
}

export class UpdateArticleDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  authorId?: string | null;

  @IsOptional()
  @IsUUID()
  coverMediaId?: string | null;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContentTranslationInput)
  translations?: ContentTranslationInput[];
}

export class CreateOpinionDto {
  @IsUUID()
  authorId!: string;

  @IsOptional()
  @IsUUID()
  coverMediaId?: string | null;

  @IsOptional()
  @IsString()
  status?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContentTranslationInput)
  translations!: ContentTranslationInput[];
}

export class UpdateOpinionDto {
  @IsOptional()
  @IsUUID()
  authorId?: string | null;

  @IsOptional()
  @IsUUID()
  coverMediaId?: string | null;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContentTranslationInput)
  translations?: ContentTranslationInput[];
}
