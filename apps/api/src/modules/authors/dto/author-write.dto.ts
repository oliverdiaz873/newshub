import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const AUTHOR_SLUG_PATTERN = /^[a-z0-9-]{3,120}$/;

export class AuthorTranslationInput {
  @IsIn(['es', 'en'])
  locale!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string | null;
}

export class CreateAuthorDto {
  @Matches(AUTHOR_SLUG_PATTERN)
  slug!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AuthorTranslationInput)
  translations!: AuthorTranslationInput[];
}

export class UpdateAuthorDto {
  @IsOptional()
  @Matches(AUTHOR_SLUG_PATTERN)
  slug?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AuthorTranslationInput)
  translations?: AuthorTranslationInput[];
}
