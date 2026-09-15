'use client';

import type { ApiFetch } from '@/shared/api/auth';

/**
 * Notifications feature service — thin wrappers over shared/api.
 * Each function builds the feature-specific URL/method and returns the
 * raw Response; error handling and response typing stay at the call
 * sites (unchanged behavior). No Repository/Adapter/Facade patterns.
 */

/** GET /notifications?page=&limit=20 — inbox page source. */
export function listNotifications(apiFetch: ApiFetch, page: number): Promise<Response> {
  return apiFetch(`/notifications?page=${page}&limit=20`);
}

/** POST /notifications/:id/read — mark a single notification as read. */
export function markNotificationRead(apiFetch: ApiFetch, id: string): Promise<Response> {
  return apiFetch(`/notifications/${id}/read`, { method: 'POST' });
}

/** POST /notifications/read-all — mark all notifications as read. */
export function markAllNotificationsRead(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/notifications/read-all', { method: 'POST' });
}
