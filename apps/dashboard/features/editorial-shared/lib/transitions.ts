/**
 * Client-side mirror of the server state machine
 * (apps/api/src/common/transitions.ts — the single source of truth).
 *
 * UX ONLY: buttons for doomed (status, action) pairs are disabled before
 * calling, but the backend remains authoritative and every 409
 * `invalid_transition` is still handled as a safety net.
 */

export type EditorialStatus = 'draft' | 'review' | 'published' | 'archived';
export type EditorialAction = 'publish' | 'unpublish' | 'archive' | 'restore' | 'reject' | 'delete';

const MATRIX: Record<Exclude<EditorialAction, 'delete'>, Partial<Record<EditorialStatus, EditorialStatus | null>>> = {
  publish: { review: 'published', published: null },
  unpublish: { published: 'draft', draft: null },
  archive: { published: 'archived', draft: 'archived', archived: null },
  restore: { archived: 'draft' },
  reject: { review: 'draft', draft: null },
};

/** True when the action is worth attempting (valid target or idempotent no-op). */
export function canTransition(status: string, action: EditorialAction): boolean {
  // Delete is a removal (no status check server-side), always attemptable.
  if (action === 'delete') return status === 'draft' || status === 'review' || status === 'published' || status === 'archived';
  const row = MATRIX[action];
  if (!row) return false;
  return (row as Record<string, EditorialStatus | null | undefined>)[status] !== undefined;
}

/** Row/bulk actions offered per status (delete is a removal, not a transition). */
export function actionsFor(status: string): EditorialAction[] {
  if (status === 'published') return ['unpublish', 'archive'];
  if (status === 'archived') return ['restore', 'delete'];
  if (status === 'review') return ['publish', 'reject', 'archive', 'delete'];
  return ['archive', 'delete'];
}
