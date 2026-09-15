/**
 * Dashboard runtime config.
 * API base is derived from NEXT_PUBLIC_API_URL (never hardcoded in UI).
 * Falls back to the API dev default used by the auth client.
 */
export const DEFAULT_API_BASE = 'http://localhost:3001/api/v1';

export function getApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim().replace(/\/+$/, '');
  return DEFAULT_API_BASE;
}
