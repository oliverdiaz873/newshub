# AGENTS.md — Working with Newshub

Instructions for human developers and AI agents modifying this
repository. The authority order is defined in
`docs/source-of-truth.md` (implementation first); this file is
operational guidance, not a source of truth.

## Project layout

Monorepo with four independent apps (no root `package.json`, no
workspaces — run every command from `apps/<name>/`):

- `apps/api` — NestJS editorial API (`/api/v1`), PostgreSQL + Prisma.
- `apps/storefront` — public Next.js site (`:3000` dev).
- `apps/dashboard` — editorial back-office (`:3002` dev).
- `apps/e2e` — Playwright harness (isolated DB, ports `3210-3212`).

Start with `docs/getting-started.md`; architecture in
`docs/architecture.md`; structure in `docs/folder-structure.md`;
decisions in `docs/adr/`; deferred work in `docs/technical-debt.md`.

## Before modifying code

1. Inspect the current implementation (code wins over docs).
2. Check relevant contracts (`apps/api/docs/business-rules.md`).
3. Check `Accepted` ADRs; never treat `Proposed` as implemented.
4. Check specialized docs for the area (`docs/features/`,
   `docs/dashboard/`, `apps/e2e/docs/`).
5. Check `docs/technical-debt.md` for deliberate deferrals.
6. Exclude `STALE` / historical material.
7. On contradiction: stop and report with file paths — never
   resolve silently (code vs `Accepted` ADR = architecture
   inconsistency requiring review).

## Scope rules

- Keep changes minimal and proportional; no refactors, no drive-by
  fixes, no new dependencies without explicit approval.
- Never touch: secrets/`.env` contents, production data, CI
  workflows, or `main` directly.
- `Proposed → Accepted` transitions only by Oliver's explicit
  approval. Never mark an ADR `Accepted` yourself.
- A rejected ADR stays rejected; reopen the topic with a new ADR,
  never by editing history.
- Documentation touched by a change must be updated in the same
  scope (code change → identify affected docs → update → validate
  consistency).

## Quality gates

Run the gates for every app touched (from its own directory):

- `npm run type-check`, `npm run lint`, `npm run build`
  (all three JS apps).
- API: `npm test` (unit), `npm run test:e2e` when behavior changes.
- E2E: `cd apps/e2e && npm test` when flows change.
- CI (`.github/workflows/ci.yml`) runs `audit-gate`, lint,
  type-check, build, and tests per app; merges stay manual.

## Git workflow

- Feature/fix/docs branches off `origin/main`; small, traceable
  commits; push and open a PR — never merge, auto-merge, or close
  without explicit approval. Merges are manual by Oliver.
- Keep diffs scoped: unrelated files (generated `next-env.d.ts`,
  compiled `messages/`, logs) must not leak into commits.
- Docs-only changes need no builds; verify paths, ports, and
  cross-references instead.

## Language

Technical repository documentation stays in English. Keep names,
IDs (`BR-XXX`, `TD-XXX`, `ADR-NNN`), and conventions as-is; never
renumber historical IDs.
