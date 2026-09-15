import { ConflictException } from '@nestjs/common';

export const PLANNING_TYPES = ['pitch', 'assignment'] as const;
export type PlanningType = (typeof PLANNING_TYPES)[number];

export const PLANNING_STATUSES = [
  'pitched',
  'assigned',
  'in-progress',
  'in-review',
  'done',
  'cancelled',
] as const;
export type PlanningStatus = (typeof PLANNING_STATUSES)[number];

export const PLANNING_PRIORITIES = ['low', 'normal', 'high'] as const;

export type PlanningAction = 'assign' | 'start' | 'submit' | 'complete' | 'cancel' | 'reopen';

/**
 * Planning state machine (Increment 8, locked matrix).
 *
 * Returns the target status, or null when the entity already satisfies the
 * action (idempotent no-op → 200 unchanged). Anything else is a 409 with
 * the stable `invalid_transition` code (same contract as editorial).
 */
export function resolvePlanningTransition(current: string, action: PlanningAction): string | null {
  if (action === 'assign') {
    if (current === 'assigned') return null;
    if (current === 'pitched') return 'assigned';
  } else if (action === 'start') {
    if (current === 'in-progress') return null;
    if (current === 'assigned') return 'in-progress';
  } else if (action === 'submit') {
    if (current === 'in-review') return null;
    if (current === 'in-progress') return 'in-review';
  } else if (action === 'complete') {
    if (current === 'done') return null;
    if (current === 'in-review') return 'done';
  } else if (action === 'cancel') {
    if (current === 'cancelled') return null;
    if (current === 'pitched' || current === 'assigned' || current === 'in-progress' || current === 'in-review') {
      return 'cancelled';
    }
  } else if (action === 'reopen') {
    if (current === 'pitched') return null;
    if (current === 'done' || current === 'cancelled') return 'pitched';
  }
  throw new ConflictException({
    code: 'invalid_transition',
    error: 'Conflict',
    message: `Cannot ${action} from '${current}'.`,
  });
}

/** An item needs attention when past due and not in a terminal status. */
export function isOverdue(status: string, dueAt: Date | null): boolean {
  if (!dueAt) return false;
  if (status === 'done' || status === 'cancelled') return false;
  return dueAt.getTime() < Date.now();
}
