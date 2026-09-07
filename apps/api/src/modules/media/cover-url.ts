/** Public URL for a cover without ever exposing the storage key layout. */
export function publicApiUrl(): string {
  return (process.env.API_PUBLIC_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
}

/**
 * Cover URL rule (F5): legacy seeded keys are root-relative paths served by
 * the storefront itself; uploaded keys resolve to the public media route.
 */
export function coverUrl(cover: { id: string; storageKey: string } | null): string {
  if (!cover) return '';
  if (cover.storageKey.startsWith('/')) return cover.storageKey;
  return `${publicApiUrl()}/api/v1/media/${cover.id}/content`;
}
