'use client';

import type { ApiFetch } from '@/shared/api/auth';

/**
 * Planning feature service — thin wrappers over shared/api.
 * Raw Response return; error handling stays at the call sites.
 */

export interface StaffOption {
  id: string;
  label: string;
}

/** GET /planning?... — list with caller-built filters. */
export function listPlanning(apiFetch: ApiFetch, params: URLSearchParams): Promise<Response> {
  return apiFetch(`/planning?${params.toString()}`);
}

/** GET /planning/calendar?from=&to= — month buckets + scheduled content. */
export function getPlanningCalendar(apiFetch: ApiFetch, from: string, to: string): Promise<Response> {
  return apiFetch(`/planning/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

/** POST /planning — create (body built by the caller). */
export function createPlanning(apiFetch: ApiFetch, body: Record<string, unknown>): Promise<Response> {
  return apiFetch('/planning', { method: 'POST', body: JSON.stringify(body) });
}

/** PATCH /planning/:id — update (body built by the caller). */
export function updatePlanning(apiFetch: ApiFetch, id: string, body: Record<string, unknown>): Promise<Response> {
  return apiFetch(`/planning/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

/** DELETE /planning/:id — remove. */
export function removePlanning(apiFetch: ApiFetch, id: string): Promise<Response> {
  return apiFetch(`/planning/${id}`, { method: 'DELETE' });
}

/** POST /planning/:id/:action — assign|start|submit|complete|cancel|reopen. */
export function transitionPlanning(
  apiFetch: ApiFetch,
  id: string,
  action: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  return apiFetch(`/planning/${id}/${action}`, {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/**
 * Staff roster for assignee/reviewer selects.
 *
 * There is NO dedicated users endpoint (apps/api untouched by design), so
 * the roster is derived best-effort from distinct audit actors — the
 * least-coupled existing mechanism. The API validates assignee/reviewer
 * ids server-side; manual UUID entry remains possible.
 * If a users endpoint ever appears, replace this implementation only.
 */
export async function listPlanningStaff(apiFetch: ApiFetch): Promise<StaffOption[]> {
  try {
    const res = await apiFetch('/audit-log?limit=100');
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data: Array<{ actor: { id: string; email: string; displayName: string } | null }>;
    };
    const seen = new Map<string, string>();
    for (const row of json.data) {
      if (row.actor && !seen.has(row.actor.id)) {
        seen.set(row.actor.id, `${row.actor.displayName} (${row.actor.email})`);
      }
    }
    return [...seen].map(([id, label]) => ({ id, label }));
  } catch {
    return [];
  }
}
