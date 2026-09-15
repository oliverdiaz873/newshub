import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Optional rejection reason (Increment 7). Persisted only in audit metadata + notification payload. */
export class RejectDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
