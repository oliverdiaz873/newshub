import { ArrayMinSize, IsArray, IsIn, IsUUID } from 'class-validator';

export const BULK_ACTIONS = ['publish', 'unpublish', 'archive', 'restore', 'reject', 'delete'] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];

/**
 * Bulk payload. `ids: []` fails DTO validation (400 via DtoPipe).
 * Over-limit batches (> BULK_MAX_IDS) are rejected with 422 in the service,
 * so the size policy stays in one place with the execution semantics.
 */
export class BulkArticlesDto {
  @IsIn([...BULK_ACTIONS])
  action!: BulkAction;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids!: string[];
}
