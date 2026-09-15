import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BULK_MAX_IDS, toBulkCode, type BulkItemResult } from './bulk-codes';
import type { BulkAction } from './dto/bulk.dto';

describe('bulk-codes', () => {
  it('caps batches at 50 ids', () => {
    expect(BULK_MAX_IDS).toBe(50);
  });

  it('preserves stable embedded codes (invalid_transition, slug_taken, media_in_use)', () => {
    for (const code of ['invalid_transition', 'slug_taken', 'media_in_use']) {
      expect(toBulkCode(new ConflictException({ code, error: 'Conflict', message: code }))).toBe(code);
    }
  });

  it('maps NotFoundException to not_found', () => {
    expect(toBulkCode(new NotFoundException('Article not found.'))).toBe('not_found');
  });

  it('maps plain conflicts and validation errors without embedded codes', () => {
    expect(toBulkCode(new ConflictException('plain'))).toBe('conflict');
    expect(toBulkCode(new UnprocessableEntityException('Spanish required.'))).toBe('unprocessable');
  });

  it('maps unknown failures to failed', () => {
    expect(toBulkCode(new Error('boom'))).toBe('failed');
    expect(toBulkCode(null)).toBe('failed');
  });

  it('types per-item results with optional codes only on failure', () => {
    const ok: BulkItemResult = { id: 'a', ok: true };
    const failed: BulkItemResult = { id: 'b', ok: false, code: 'invalid_transition' };
    expect(ok.code).toBeUndefined();
    expect(failed.code).toBe('invalid_transition');
  });

  it('covers every bulk action name', () => {
    const actions: BulkAction[] = ['publish', 'unpublish', 'archive', 'restore', 'reject', 'delete'];
    expect(actions).toHaveLength(6);
  });
});
