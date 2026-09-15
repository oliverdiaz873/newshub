import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

/** Maximum ids accepted per bulk request. Larger batches are rejected with 422. */
export const BULK_MAX_IDS = 50;

export interface BulkItemResult {
  id: string;
  ok: boolean;
  code?: string;
}

/**
 * Maps a per-item failure to a stable contract code for the bulk response.
 * The raw backend message is never exposed; callers summarize code counts.
 */
export function toBulkCode(err: unknown): string {
  if (err instanceof HttpException) {
    const response = err.getResponse();
    const embedded =
      typeof response === 'object' && response !== null && 'code' in response
        ? (response as { code?: unknown }).code
        : undefined;
    if (typeof embedded === 'string' && embedded.length > 0) return embedded;
    if (err instanceof NotFoundException) return 'not_found';
    if (err instanceof ConflictException) return 'conflict';
    if (err instanceof UnprocessableEntityException) return 'unprocessable';
    if (err instanceof BadRequestException) return 'bad_request';
  }
  return 'failed';
}
