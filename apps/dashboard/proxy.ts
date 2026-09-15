import { NextResponse, type NextRequest } from 'next/server';

/**
 * Increment 0 proxy (routing hygiene only; Next 16 `proxy` convention).
 * Authentication is NOT decided here: the session lives in the HttpOnly
 * API-path refresh cookie (nh_refresh, path /api/v1/auth) on the API
 * origin, which dashboard document requests never carry. The API is the
 * authoritative enforcer (401); apps route UX redirects via RequireAuth.
 */
export default function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const acceptLanguage = request.headers.get('accept-language') ?? '';
  const prefersSpanish = /es/i.test(acceptLanguage.split(',')[0] ?? '');
  response.headers.set('x-nh-locale-hint', prefersSpanish ? 'es' : 'en');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
