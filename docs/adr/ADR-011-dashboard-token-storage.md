# ADR-011: Dashboard Access-Token Storage & Silent Restore

Status: Accepted
Date-Proposed: 2026-09-09
Date-Accepted: 2026-09-09
Owner/Deciders: Oliver (Arch) + agent (draft)
Refs: ADR-010 (auth mechanism), `apps/dashboard/src/lib/auth.tsx`

## Context

M1 must decide where the dashboard keeps the short-lived access token and
what happens on a fresh tab without one. ADR-010 locked the server side
(short JWT + rotated opaque refresh in an HttpOnly cookie) but not the
client side. The dashboard already stored the token in `sessionStorage`
(`nh_access`) with no documented rationale, and `AuthProvider.ready` never
initialized on boot (only login/logout set it).

## Decision: keep sessionStorage + silent restore on boot

- Keep the access token in `sessionStorage`: tab-scoped, no disk
  persistence beyond the session, strictly better than `localStorage`.
- On provider mount with no token, attempt one silent refresh via the
  HttpOnly cookie, then resolve the profile (`/auth/me`). Anonymous +
  `ready=true` when there is no valid session — never an infinite loader.
- `tryRefresh` is single-flight: concurrent callers share one Promise and
  produce a single HTTP refresh, so a boot refresh racing a 401 retry can
  never double-spend the cookie (rotation + reuse detection would burn the
  family otherwise).
- StrictMode-safe mount guard: the boot effect runs once per mount in
  production and survives the dev double-invoke without a second HTTP
  refresh, while later legitimate refreshes still work.

## Alternatives Considered

- `localStorage`: rejected — persists the token on disk with no benefit
  over `sessionStorage` for this dashboard.
- Memory-only: rejected — logout on every reload for marginally better
  XSS posture; the refresh cookie already bounds token lifetime.
- Access token in HttpOnly cookie: rejected for now — requires CSRF
  protection and backend changes, out of scope.
- No restore (status quo ante): rejected — new tabs forced a manual login
  despite a valid refresh cookie, and `ready` never became true on boot.

## Consequences

- New tabs silently recover the session while the refresh cookie is valid.
- E2E is unaffected: the fixture injects `nh_access` before navigation,
  so boot skips the refresh (zero extra logins, rate-limit safe).
- One extra `POST /auth/refresh` per anonymous boot (401 → anonymous);
  negligible and cache-free by nature.
