import { IsArray, IsBoolean, IsIn, IsOptional, IsUrl, MaxLength } from 'class-validator';

export const WEBHOOK_EVENTS = ['published', 'unpublished'] as const;

export class CreateWebhookDto {
  @IsUrl({ require_protocol: true, protocols: ['https', 'http'] })
  @MaxLength(500)
  url!: string;

  @IsOptional()
  @IsArray()
  @IsIn([...WEBHOOK_EVENTS], { each: true })
  events?: string[];
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https', 'http'] })
  @MaxLength(500)
  url?: string;

  @IsOptional()
  @IsArray()
  @IsIn([...WEBHOOK_EVENTS], { each: true })
  events?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
