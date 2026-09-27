/**
 * Resolves media URLs for the dashboard without duplicating storefront assets.
 * Legacy seeded paths live in the storefront; uploaded media is served by the API.
 */
export function resolveMediaUrl(value: string): string {
  if (!value) return value;

  try {
    return new URL(value).toString();
  } catch {
    // Continue with the known service-relative URL rules below.
  }

  if (value.startsWith('/images/')) {
    const storefrontOrigin = (process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
    return `${storefrontOrigin}${value}`;
  }

  if (value.startsWith('/api/v1/')) {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/+$/, '');
    const apiOrigin = apiBase.endsWith('/api/v1') ? apiBase.slice(0, -'/api/v1'.length) : apiBase;
    return `${apiOrigin}${value}`;
  }

  return value;
}
