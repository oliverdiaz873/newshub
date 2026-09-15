import { ConflictException } from '@nestjs/common';

export const EDITORIAL_STATUSES = ['draft', 'review', 'published', 'archived'] as const;
export type EditorialStatus = (typeof EDITORIAL_STATUSES)[number];
export type TransitionAction = 'publish' | 'unpublish' | 'archive' | 'restore' | 'reject';

/**
 * Publishing state machine (F4, locked matrix).
 *
 * Returns the target status, or null when the entity already satisfies the
 * action (idempotent no-op → 200 unchanged). Anything else is a 409 with
 * the stable `invalid_transition` code.
 */
export function resolveTransition(current: string, action: TransitionAction): string | null {
  if (action === 'publish') {
    if (current === 'published') return null;
    // Increment 7: two-step approval — publish only from review.
    // Drafts must be submitted for review first.
    if (current === 'review') return 'published';
  } else if (action === 'unpublish') {
    if (current === 'draft') return null;
    if (current === 'published') return 'draft';
  } else if (action === 'archive') {
    if (current === 'archived') return null;
    if (current === 'published' || current === 'draft') return 'archived';
  } else if (action === 'restore') {
    if (current === 'archived') return 'draft';
  } else if (action === 'reject') {
    // Increment 2: review back to draft. No reason persisted in P0
    // (reason deferred to the P1 audit trail).
    if (current === 'draft') return null;
    if (current === 'review') return 'draft';
  }
  throw new ConflictException({
    code: 'invalid_transition',
    error: 'Conflict',
    message: `Cannot ${action} from '${current}'.`,
  });
}
