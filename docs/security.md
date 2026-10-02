# Security

Inventory of the security controls that actually exist in Newshub on
`origin/main`. It describes the implemented system and its limits — it
introduces no new decisions. Design rationale lives in
`docs/adr/ADR-010` and `docs/adr/ADR-011`; authority order follows
`docs/source-of-truth.md` (implementation first).

## Overview

- Public reading endpoints are unauthenticated by design; every
  editorial (write/manage) endpoint requires a Bearer access token plus
  a role check (`apps/api/src/modules/auth/`).
- Short-lived JWT access tokens (default 15 min) + opaque rotating
  refresh tokens in an HttpOnly cookie (default 7 days).
- Three roles enforced by a database CHECK constraint:
  `admin`, `editor`, `reviewer`. There is **no** `lector`/`viewer` role.
- Global rate limiting (default 1000 req/min) with stricter per-route
  overrides on `login` (10/min) and `refresh` (20/min).
- `helmet()` + restrictive CORS (explicit origins, credentials allowed).
- Dependency audit gate blocks CI on new High/Critical findings.

## Authentication

Login (`POST /api/v1/auth/login`, `apps/api/src/modules/auth/auth.controller.ts`):

1. Credentials validated against `argon2id` password hashes
   (`apps/api/src/modules/auth/password.ts`). Unknown user and wrong
   password produce the identical `401 Invalid email or password`
   shape, so accounts cannot be enumerated.
2. On success the API issues an access token (returned in the JSON
   body) and sets the refresh token as an HttpOnly cookie.
3. `GET /api/v1/auth/me` (guarded) returns the current profile.

Failure behavior is always `401`; the login flow additionally records
a best-effort `login.failed` audit row that never breaks the 401
contract (`apps/api/src/modules/auth/auth.service.ts`).

### Dashboard session handling

The dashboard keeps the access token in `sessionStorage` (`nh_access`)
and sends it as a `Bearer` header; on boot it attempts one silent
refresh via the HttpOnly cookie (single-flight, StrictMode-safe).
See `apps/dashboard/shared/api/auth.tsx` and
`docs/adr/ADR-011-dashboard-token-storage.md`. The dashboard `proxy.ts`
does **not** enforce authentication — the API is the authoritative
enforcer (401); the dashboard only routes UX redirects.

## Authorization and RBAC

- Roles are enforced by `JwtAuthGuard` (strict Bearer → `401`) +
  `RolesGuard` (`@Roles(...)` metadata → `403 Insufficient role`);
  routes without metadata are public
  (`apps/api/src/modules/auth/jwt-auth.guard.ts`,
  `apps/api/src/modules/auth/roles.guard.ts`).
- Role matrix (verified in controllers):
  - `admin`-only: all `/syndication/*` and `/webhooks/*` routes.
  - `admin, editor`: content creation and destructive actions
    (`POST/PATCH/DELETE` on articles, opinions, categories, authors,
    media, most planning/scheduling mutations).
  - `admin, editor, reviewer`: read/manage views — editorial listings,
    article/opinion detail, history revisions, audit log,
    notifications, media listing, selected planning reads.
  - Public (no guard): health, public article/opinion/category
    listings and detail, `GET /media/:id/content`.
- In MVP practice `admin` and `editor` share content permissions;
  `admin`-only is reserved for future truly-admin features
  (`roles.guard.ts`). There are no per-owner editorial restrictions
  beyond roles (any editor may act on any content).

## JWT and Refresh Tokens

- **Access token:** JWT (`jsonwebtoken`) with claims
  `{ sub, email, role }`, signed with `JWT_SECRET`
  (`apps/api/src/modules/auth/tokens.ts`).
- **Refresh token:** opaque 48-byte random hex; only its SHA-256 hash
  is persisted. It is never a JWT.
- **Expiration:** access 15 min (`JWT_ACCESS_TTL_MIN`), refresh 7 days
  (`REFRESH_TTL_DAYS`); both env-overridable, exact values still open
  per ADR-010.
- **Rotation:** every `refresh` revokes the presented token and issues
  a new pair (`auth.service.ts`). Reuse detection: presenting a revoked
  token burns the whole family (`revokeFamily`) and returns 401.
- **Revocation:** `logout` revokes the presented token; expired tokens
  are rejected on use. There is no server-side access-token blocklist
  (short TTL bounds the window instead).
- **Validation:** `JwtAuthGuard` verifies signature + expiry on every
  guarded request; `me` additionally requires the user to still exist.
- **Storage:** access token in dashboard `sessionStorage`
  (tab-scoped, never on disk beyond the session); refresh token in
  HttpOnly cookie `nh_refresh`, `path /api/v1/auth`, `SameSite=lax`,
  `Secure` only in production (so local HTTP dev keeps working).
- **Transport:** access via `Authorization: Bearer` header; refresh via
  cookie only.

## Rate Limiting

- Mechanism: `@nestjs/throttler` with a global `APP_GUARD`
  (`apps/api/src/app.module.ts`): default **1000 req/min per IP per
  route** (`ttl: 60000`), overridable via `THROTTLE_DEFAULT_LIMIT`.
- Stricter overrides: `login` **10/min**, `refresh` **20/min**
  (`auth.controller.ts`). Exceeding returns `429` (`rate_limited`,
  covered by `apps/api/test/throttle.e2e-spec.ts`).
- No `trust-proxy`: the client IP is the direct TCP peer until a real
  proxy topology exists (noted in code). Limits do not differ by
  environment except through `THROTTLE_DEFAULT_LIMIT`.

## HTTP Security

- `helmet()` is applied globally (`apps/api/src/main.ts`); no custom
  header configuration beyond Helmet defaults — do not assume CSP,
  HSTS, or other headers beyond what Helmet sets (see live header
  evidence in `docs/runbooks/web-audit.md`).
- The dashboard sets `SAMEORIGIN` framing protection (see web-audit).

## CORS

- Enabled with an explicit origin allowlist, credentials allowed, no
  wildcards (`apps/api/src/main.ts`):
  - Dashboard origin from `DASHBOARD_URL`, default
    `http://localhost:3212` (the E2E dashboard — local dev on `:3002`
    must override it).
  - Storefront origin from `STOREFRONT_URL`, default
    `http://localhost:3000`.
- Production must set both variables explicitly (no fallback is
  correct there).

## Secrets and Environment Configuration

- All configuration comes from environment variables; there is no
  config module with validation — missing values fall back to dev
  defaults or throw only in production paths.
- Secret categories: `JWT_SECRET` (signing; server refuses to boot in
  production without it, insecure dev fallback otherwise),
  database URLs, E2E passwords/`E2E_JWT_SECRET` (empty placeholders in
  `apps/e2e/.env.example`, required at runtime with no fallback),
  CORS origins, token TTLs. Reference files: `apps/api/.env.example`,
  `apps/dashboard/.env.example`, `apps/storefront/.env.example`,
  `apps/e2e/.env.example`.
- Never commit `.env`, `.env.local`, or `.env.e2e` (all gitignored).
  The destructive Prisma seed additionally refuses to run with
  `NODE_ENV=production` unless `ALLOW_DESTRUCTIVE_SEED=true`
  (`apps/api/src/common/seed-guard.ts`).

## Dependency Security

- `scripts/audit-gate.mjs` runs `npm audit --omit=dev` and fails CI
  only on **new** High/Critical findings, matched by advisory
  (GHSA) ID against per-app baselines (`apps/*/audit-baseline.json`;
  only the API baseline currently accepts one advisory).
- Enforced in CI for `api`, `storefront`, and `dashboard`
  (`.github/workflows/ci.yml`); the API job additionally runs
  `audit-filter-guard.mjs` (audit-catalog drift). `scripts/ssot-guard.mjs`
  exists but does not run in CI.
- Process record: `docs/runbooks/dependency-audit.md`. This section
  documents the process, not historical findings.

## Security Auditing

Security-relevant actions recorded via `AuditService.record`
(best-effort; failures are logged, never break the request):

- `login`, `login.failed`, `logout` (auth service).
- `webhook.ping`, `notify.due-soon`, `notify.overdue`,
  `media.delete` (respective services).
- Content history is append-only (`revisions`); deleting content
  leaves its revisions stored but unreachable (TD-003).

Not audited: `schedule.failed` executions leave notification + log
only, no audit row (TD-015). The audit trail itself has no retention
or pruning policy (TD-004).

## Known Limitations

- No `Secure` cookie flag outside production (local HTTP dev).
- No server-side access-token revocation list (bounded by 15-min TTL).
- Rate limiting is per direct-TCP-peer IP (no `trust-proxy`); trivially
  shared behind common egress IPs and too coarse behind NAT.
- No per-owner authorization: any `editor` may act on any content.
- Some guarantees rest on missing API surface rather than database
  constraints (BR-016/BR-018; see `apps/api/docs/business-rules.md`).
- Notifications/webhook fan-out is best-effort and lost on crash
  without breaking the editorial action.
- Bulk operations are per-item isolated, with no enclosing
  transaction.
- No staging/production environment definition, no deploy rollback
  procedure (only DB/media disaster recovery in
  `docs/runbooks/backup-restore.md`).
- `helmet()` defaults only; no explicit CSP/HSTS configuration.
- Open items from ADR-010 still provisional: exact TTLs, lockout,
  recovery, MFA/OAuth.

## Deferred Security Work

- Retention/orphan policy for revisions and audit events (TD-003,
  TD-004) — needs product/legal approval first.
- Strict date validation returning 400 (TD-009) — decision before
  code.
- `schedule.failed` audit emission (TD-015).
- Per-action metadata renderers and translated audit cells
  (TD-005, TD-010) — display hardening, not access control.

## Source References

- `apps/api/src/modules/auth/` — `tokens.ts`, `auth.service.ts`,
  `auth.controller.ts`, `jwt-auth.guard.ts`, `roles.guard.ts`,
  `password.ts`
- `apps/api/src/main.ts` — Helmet, CORS, global prefix
- `apps/api/src/app.module.ts` — throttler configuration
- `apps/api/.env.example`, `apps/e2e/.env.example`
- `apps/dashboard/shared/api/auth.tsx`, `apps/dashboard/proxy.ts`
- `docs/adr/ADR-010-editorial-auth.md`,
  `docs/adr/ADR-011-dashboard-token-storage.md`
- `docs/runbooks/web-audit.md`, `docs/runbooks/dependency-audit.md`
- `scripts/audit-gate.mjs`, `apps/*/audit-baseline.json`
- `docs/technical-debt.md` (TD-003, TD-004, TD-009, TD-015)
