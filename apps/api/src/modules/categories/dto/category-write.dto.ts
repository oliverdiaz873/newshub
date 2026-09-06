import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const SLUG_PATTERN = /^[a-z0-9-]{3,120}$/;

export class TranslationInput {
  @IsIn(['es', 'en'])
  locale!: string;

  @Matches(SLUG_PATTERN)
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

export class CreateCategoryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TranslationInput)
  translations!: TranslationInput[];
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TranslationInput)
  translations?: TranslationInput[];
}
