import { buildMeta, MAX_LIMIT, normalizePagination } from './pagination';

describe('pagination', () => {
  it('defaults page 1 and caps limit at MAX_LIMIT', () => {
    expect(normalizePagination(undefined, undefined)).toEqual({ page: 1, limit: 20 });
    expect(normalizePagination(0, 9999)).toEqual({ page: 1, limit: MAX_LIMIT });
    expect(normalizePagination(2, 5)).toEqual({ page: 2, limit: 5 });
  });

  it('builds meta with at least one page', () => {
    expect(buildMeta(1, 20, 42)).toEqual({ page: 1, limit: 20, total: 42, totalPages: 3 });
    expect(buildMeta(1, 20, 0)).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 });
  });
});
