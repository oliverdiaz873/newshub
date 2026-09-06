export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function normalizePagination(page?: number, limit?: number): { page: number; limit: number } {
  const safePage = Number.isInteger(page) && (page as number) > 0 ? (page as number) : 1;
  const requested = Number.isInteger(limit) ? (limit as number) : DEFAULT_LIMIT;
  const safeLimit = Math.min(Math.max(requested, 1), MAX_LIMIT);
  return { page: safePage, limit: safeLimit };
}

export function buildMeta(page: number, limit: number, total: number): PageMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
