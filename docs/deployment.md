# Deployment

Operational reference for Newshub environments, CI, builds, database
deployment, and rollback — describing **what exists now**, not what is
planned. Developer setup lives in `docs/getting-started.md`; security
controls are inventoried separately in `docs/security.md` (landed via
its own branch; if not yet merged, treat that file as pending). Authority order follows
`docs/source-of-truth.md` (implementation first).

## Overview

- Local development: four independent apps + a local PostgreSQL
  instance (non-default port `5433`).
- CI (`.github/workflows/ci.yml`): four independent quality-gate jobs
  (`api`, `storefront`, `dashboard`, `e2e`); **no deploy job**.
- Hosting: the storefront defaults to a Vercel URL, but **no Vercel
  project configuration, deploy workflow, or production topology is
  committed in this repository**. Anything outside the repo is marked
  `Not verified` below.
- There is **no dedicated staging environment** and **no documented
  automated rollback**.

## Environments

| Environment | Status | Evidence |
|---|---|---|
| Local development | EXISTS, configured | Per-app `.env.example`, ports below |
| CI (`ubuntu-latest` runners) | EXISTS, configured | `.github/workflows/ci.yml` |
| Vercel Preview | PARTIALLY CONFIGURED | CI status reports Vercel checks; no `vercel.json` or dashboard config in repo |
| Vercel Production | PARTIALLY CONFIGURED | Storefront default `SITE_URL` points at a `*.vercel.app` domain; no repo-side production config |
| Staging | NOT PRESENT | No dedicated staging environment is currently configured |

## Local Development

Per-app terminals (see `docs/getting-started.md` for setup):

| App | Dev | Build | Start | Port | Env file |
|---|---|---|---|---|---|
| API | `npm run dev` (`tsx watch src/main.ts`) | `tsc -p tsconfig.build.json` | `node dist/main.js` | `3001` (`PORT`, default) | `apps/api/.env` |
| Storefront | `npm run dev` (runs `build:locales` first) | `next build` (same pre-step) | `next start` | `3000` (Next default) | `apps/storefront/.env.local` |
| Dashboard | `npm run dev` (`next dev --port 3002`) | `next build` | `next start --port 3002` | `3002` | `apps/dashboard/.env.local` |

The API requires PostgreSQL plus `prisma migrate deploy`,
`prisma generate`, and `prisma:seed` before first use. Frontends
require `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`; the
dashboard additionally uses
`NEXT_PUBLIC_STOREFRONT_URL=http://localhost:3000`, and local
dashboard development on `:3002` must override `DASHBOARD_URL`
(default `:3212`, the E2E origin) for cookie refresh CORS.

### PostgreSQL

- Local user-space instance on port **`5433`** (non-default), three
  databases: `newshub_dev`, `newshub_test`, `newshub_e2e`
  (`apps/api/.env.example`, `apps/e2e/.env.example`).
- Not containerized in-repo (no Docker files); connection via Prisma
  `DATABASE_URL` / `TEST_DATABASE_URL`.
- CI differs intentionally: PostgreSQL installed via `apt` on port
  **`5432`** with databases `newshub_test` / `newshub_e2e`
  (`ci.yml`). Local vs CI ports are not unified and not tabulated
  anywhere else — this document is that tabulation.

## CI

Workflow `.github/workflows/ci.yml` (`pull_request` and `push` on
`main`; branch protection requires `api`/`storefront`/`dashboard`
checks; merges stay manual):

1. `checkout` → `setup-node` (**Node 24**, `npm ci` per app
   lockfile) → install PostgreSQL (api/e2e jobs only).
2. API job: `audit-gate` + `audit-filter-guard`, `lint`,
   `type-check`, `build`, unit tests, API e2e (with throwaway
   `MEDIA_DIR`).
3. Storefront/dashboard jobs: `audit-gate`, `lint`, `type-check`,
   `build`.
4. E2E job: installs all four apps, `lint`, `type-check`, Playwright
   Chromium install, full suite against isolated `newshub_e2e`
   (ports `3210-3212`).
5. No artifacts are uploaded; no deploy step exists.

## Vercel

- No `vercel.json`, no deploy workflow, and no Vercel environment
  variable definitions exist in the repository (`.gitignore` only
  excludes `.vercel/`).
- Storefront production URL default:
  `https://pre-advanced-websites-news-next.vercel.app`, overridable
  via `NEXT_PUBLIC_SITE_URL`
  (`apps/storefront/src/shared/config/site.ts`). The API base and
  image remote patterns derive from `NEXT_PUBLIC_API_URL`, so
  production must set it explicitly (see `next.config.ts`).
- Dashboard and API production hosting: **Not verified** in-repo.
- Preview deployments are reported as CI checks, but branch/PR
  triggers, preview env vars, and preview API connectivity are
  **not verifiable from this repository** — documented here as a
  limitation, not a fact.

## Environment Variables

| Category | Variable | Required | Scope |
|---|---|---|---|
| Database | `DATABASE_URL`, `TEST_DATABASE_URL`, `E2E_DATABASE_URL` | required | local + CI (different ports/hosts) |
| Auth | `JWT_SECRET` | required in prod (refuses boot); dev fallback + CI/E2E test placeholders | local + CI + E2E |
| Auth TTLs | `JWT_ACCESS_TTL_MIN` (15), `REFRESH_TTL_DAYS` (7) | optional | local |
| CORS/origins | `DASHBOARD_URL`, `STOREFRONT_URL`, `API_PUBLIC_URL` | required in prod (dev defaults) | local |
| Frontend | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STOREFRONT_URL`, `NEXT_PUBLIC_SITE_URL` | required in prod (dev defaults) | local |
| Throttling | `THROTTLE_DEFAULT_LIMIT` (1000) | optional | local + tests |
| Seed guard | `ALLOW_DESTRUCTIVE_SEED` | prod-only opt-in | operations |
| E2E identities | `E2E_*_EMAIL`, `E2E_*_PASSWORD` | required for E2E | CI + local E2E |

Secret values live only in gitignored local files or CI job env.
**Never commit real secrets.** See `docs/security.md` for the
security side of secrets handling.

## Database

- Schema: `apps/api/prisma/schema.prisma`; migrations:
  `apps/api/prisma/migrations/` (15 applied).
- Deploy path: `prisma migrate deploy` (forward-only; Prisma
  generates no down-migrations — rollback is manual SQL, and no
  per-migration rollback procedure is documented).
- Seed: `prisma:seed` (`tsx prisma/seed.ts`) truncates editorial
  tables; blocked in production without `ALLOW_DESTRUCTIVE_SEED=true`.
- Test databases: `newshub_test` (API jest e2e), `newshub_e2e`
  (Playwright; name asserted in `global-setup.ts`).
- Production migrations: **UNKNOWN** — no automation or procedure is
  committed in this repository.

## Build and Start

- Development: `tsx watch` (API) / `next dev` (frontends, storefront
  with `build:locales` pre-step).
- Build: `tsc -p tsconfig.build.json` (API) / `next build`
  (frontends).
- Production start: `node dist/main.js` (API) / `next start`
  (frontends, dashboard on `:3002`).
- CI builds all three JS apps on every PR/push to `main`.

## Health and Readiness

The API exposes (prefix `/api/v1`, throttling skipped):

- `GET /health` — liveness, process alive, no dependencies.
- `GET /health/ready` — readiness, `SELECT 1` against PostgreSQL;
  `503 Database unreachable` when the database is down
  (`apps/api/src/health/health.controller.ts`).

Frontends expose no health/readiness endpoints of their own.

## Production

Only verified facts: the storefront resolves its public URL from
`NEXT_PUBLIC_SITE_URL` with a `*.vercel.app` default. API/dashboard
production URLs, databases, triggers, secrets, and migration
procedure are **Not verified** from this repository.

## Preview

Preview deployments appear as CI checks, but triggers, env wiring,
and API connectivity cannot be verified in-repo. Do not assume
preview behaves like production.

## Rollback

| Layer | Status |
|---|---|
| Application (Vercel) | UNKNOWN in-repo (no config committed; platform-level instant rollback, if enabled there, is outside this repo) |
| Git revert | MANUAL (available via history; no documented procedure) |
| Database migrations | MANUAL, PARTIAL (forward-only `migrate deploy`; per-migration notes only in `data-model-physical-plan.md`; no tested down path) |
| Configuration | MANUAL (env files / CI job env; no versioned promotion) |

Rollback as a whole: **Known limitation** — no documented automated
rollback exists.

## Known Limitations

- No dedicated staging environment.
- No documented automated rollback (app, database, or config).
- Production topology, URLs (except the storefront default),
  secrets, and migration procedure are not defined in-repo.
- Vercel project settings and preview wiring are not verifiable
  from the repository.
- CI and local PostgreSQL ports differ (`5432` vs `5433`) without a
  shared environments table (this document now serves as the record).
- Frontends have no health/readiness endpoints.
- `DASHBOARD_URL` default targets the E2E origin; local dev must
  override it (fragile if forgotten).

## Source References

- `apps/api/package.json`, `apps/storefront/package.json`,
  `apps/dashboard/package.json`, `apps/e2e/package.json`
- `apps/api/.env.example`, `apps/storefront/.env.example`,
  `apps/dashboard/.env.example`, `apps/e2e/.env.example`
- `.github/workflows/ci.yml`
- `apps/api/src/main.ts`, `apps/api/src/app.module.ts`,
  `apps/api/src/health/health.controller.ts`
- `apps/storefront/next.config.ts`,
  `apps/storefront/src/shared/config/site.ts`
- `apps/e2e/playwright.config.ts`, `apps/e2e/global-setup.ts`,
  `apps/e2e/scripts/pretest.cjs`
- `docs/getting-started.md`,
  `docs/source-of-truth.md`,
  `docs/runbooks/backup-restore.md`
