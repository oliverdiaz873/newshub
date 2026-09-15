/**
 * Client-side mirror of the planning state machine
 * (apps/api/src/common/planning-transitions.ts — the single source of truth).
 *
 * UX ONLY: the backend remains authoritative and every 409
 * `invalid_transition` is still handled as a safety net.
 */

export type PlanningType = 'pitch' | 'assignment';
export type PlanningStatus =
  | 'pitched'
  | 'assigned'
  | 'in-progress'
  | 'in-review'
  | 'done'
  | 'cancelled';
export type PlanningAction = 'assign' | 'start' | 'submit' | 'complete' | 'cancel' | 'reopen';

const MATRIX: Record<PlanningAction, Partial<Record<PlanningStatus, PlanningStatus | null>>> = {
  assign: { pitched: 'assigned', assigned: null },
  start: { assigned: 'in-progress', 'in-progress': null },
  submit: { 'in-progress': 'in-review', 'in-review': null },
  complete: { 'in-review': 'done', done: null },
  cancel: { pitched: 'cancelled', assigned: 'cancelled', 'in-progress': 'cancelled', 'in-review': 'cancelled', cancelled: null },
  reopen: { done: 'pitched', cancelled: 'pitched', pitched: null },
};

export interface PlanningItem {
  id: string;
  type: PlanningType;
  title: string;
  description: string | null;
  categoryId: string | null;
  assigneeId: string | null;
  reviewerId: string | null;
  priority: string;
  status: PlanningStatus;
  dueAt: string | null;
  entityType: string | null;
  entityId: string | null;
  overdue: boolean;
  createdAt?: string;
  updatedAt?: string;
  assignee?: { id: string; email: string; displayName: string; role: string } | null;
  reviewer?: { id: string; email: string; displayName: string; role: string } | null;
}

/** True when the action is worth attempting (valid target or idempotent no-op). */
export function canPlanningTransition(status: string, action: PlanningAction): boolean {
  const row = MATRIX[action];
  if (!row) return false;
  return (row as Record<string, PlanningStatus | null | undefined>)[status] !== undefined;
}

/** Row actions offered per status. */
export function planningActionsFor(status: string): PlanningAction[] {
  if (status === 'pitched') return ['assign', 'cancel'];
  if (status === 'assigned') return ['start', 'cancel'];
  if (status === 'in-progress') return ['submit', 'cancel'];
  if (status === 'in-review') return ['complete', 'cancel'];
  if (status === 'done' || status === 'cancelled') return ['reopen'];
  return [];
}

/** Monday-first week buckets for calendar grouping (local zone). */
export function weekKey(date: Date): string {
  const monday = new Date(date);
  const day = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}
