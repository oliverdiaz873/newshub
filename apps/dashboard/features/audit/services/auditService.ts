'use client';

import type { ApiFetch } from '@/shared/api/auth';

/**
 * Audit feature service — thin wrappers over shared/api.
 * Each function builds the feature-specific URL and returns the raw
 * Response; error handling and response typing stay at the call sites
 * (unchanged behavior). No Repository/Adapter/Facade patterns.
 *
 * NOTE: planning staff lookup (GET /audit-log via listPlanningStaff)
 * stays encapsulated in features/planning/services/planningService.ts
 * (F8 boundary). Planning must NOT depend on this feature.
 */

/** GET /audit-log?... — filtered audit list with caller-built filters. */
export function listAuditLog(apiFetch: ApiFetch, params: URLSearchParams): Promise<Response> {
  return apiFetch(`/audit-log?${params.toString()}`);
}
