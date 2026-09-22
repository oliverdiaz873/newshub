# Getting Started

Newshub is a monorepo with four apps that install and run independently.
There is no root `package.json` and no npm workspaces: run every command
from the corresponding `apps/<name>/` directory.

Verified with Node `v24.18.1`, npm `11.16.0`, Prisma `6.19.3`,
Playwright `1.63.0`. During R-2, `type-check` was executed green in all three
JS apps, `prisma validate` passed, and the e2e `pretest.cjs` cleanup ran clean;
long-running `dev` servers were verified by flags/ports in configs instead of
being launched. `migrate deploy` and the unit suite (90/90) were last executed
green during the PR #39 series on this same machine; per-app `npm install`
follows each committed `package-lock.json` and was not re-run here because
all four `node_modules/` trees already exist.

## Prerequisites

- Node.js 22+ and npm (uses each app's committed `package-lock.json`).
- PostgreSQL 17+ with three databases: `newshub_dev`, `newshub_test`,
  `newshub_e2e` (see Database).
- No global tools required; Playwright browsers install via `npx`.

## Installation

From each app directory:

```bash
cd apps/api && npm install
cd ../storefront && npm install
cd ../dashboard && npm install
cd ../e2e && npm install
```

## Environment Variables

Copy each `.env.example` to its local file and adjust hosts/ports:

| App | File | Key variables |
|---|---|---|
| api | `apps/api/.env` | `DATABASE_URL` (dev DB), `TEST_DATABASE_URL` (jest e2e), `PORT=3001`, `JWT_SECRET`, `DASHBOARD_URL`, `STOREFRONT_URL`, `API_PUBLIC_URL` |
| storefront | `apps/storefront/.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1` |
| dashboard | `apps/dashboard/.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1` |
| e2e | `apps/e2e/.env` | `E2E_API_URL`, `E2E_*_PASSWORD`, `E2E_JWT_SECRET` (no fallback) |

## Development

Run each app in its own terminal:

```bash
cd apps/api && npm run dev          # API on :3001 (tsx watch)
cd apps/storefront && npm run dev   # site on :3000 (runs build:locales first)
cd apps/dashboard && npm run dev    # back-office on :3002
```

Port map (dev vs E2E are intentionally different):

| Service | Development | E2E harness |
|---|---|---|
| API | `:3001` | `:3211` |
| Dashboard | `:3002` | `:3212` |
| Storefront | `:3000` | `:3210` |

## Database

```bash
cd apps/api
npx prisma migrate deploy   # apply migrations (14 up to date)
npx prisma generate         # regenerate Prisma Client
npm run prisma:seed         # seed dev data (tsx prisma/seed.ts)
```

PostgreSQL is the persistence source of truth; Prisma mirrors the physical
model. Business rules live in `apps/api/docs/business-rules.md` (BR-001…BR-023).

## Testing

```bash
cd apps/api
npm test                    # unit (jest-unit): 90/90 green
npm run test:e2e            # API e2e (jest-e2e, uses TEST_DATABASE_URL)
npm run type-check          # tsc --noEmit (also available in storefront/dashboard)

cd ../e2e
npm test                    # Playwright: pretest cleanup + full suite
                            # (spins API :3211 + dashboard :3212 + storefront :3210
                            # against an isolated newshub_e2e database)
npm run type-check
npm run lint
```

E2E details (harness, coverage matrix): `apps/e2e/docs/coverage.md`.

## Playwright MCP (exploration only)

`apps/e2e` also ships a minimal Playwright MCP setup
(`mcp.config.json` + prompts) for AI-assisted exploration, reproduction and
debugging. It is **not** regression: deterministic CI authority stays in
`apps/e2e/tests/`, and MCP never runs in CI. Details:
`apps/e2e/docs/mcp/README.md`.

```bash
cd apps/e2e && npm run mcp:start   # manual exploration sessions only
```
