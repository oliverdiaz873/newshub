# Dashboard Documentation — Newshub

> Source of truth for migrating `newshub-dashboard-mockup` into `apps/dashboard` and evolving it into a professional editorial CMS. Read-only audit basis; no code was changed to produce these docs.

## Purpose

This folder defines:

1. What the Newshub Dashboard must be (see `dashboard-overview.md`).
2. What visual/UX language to preserve from the mockup (see `ui-ux-specification.md`).
3. What modules it must have and how each behaves (`articles.md`, `opinions.md`, `media.md`, `planning.md`, `analytics.md`, `notifications.md`, `audit-log.md`, `seo.md`, `scheduling.md`, `revisions.md`).
4. What already exists across Dashboard ↔ API ↔ DB versus what is mock-only or missing (`gap-matrix.md`).
5. How Dashboard ↔ REST API ↔ NestJS ↔ Prisma ↔ PostgreSQL must relate (see `dashboard-overview.md` and `migration-strategy.md`).
6. The implementation order after this phase (`roadmap.md`).

## Relation to other surfaces

| Surface | Path | Role in this documentation |
|---|---|---|
| Mockup (UX reference, frozen) | `C:\Users\dell\Desktop\newshub-dashboard-mockup` (`index, articles, article-edit, opinions, opinion-edit, categories, authors, media, settings, login.html` + `assets/js/mock.js`) | Visual and interaction reference. Never copy vanilla code literally; adapt patterns to Next.js + TypeScript. |
| Real dashboard | `apps/dashboard` (Next.js 16, React 19, App Router, 11 source files) | Current implementation baseline. Audited as REAL / PARTIAL / MISSING. |
| API | `apps/api` (NestJS modular monolith, `api/v1` prefix) | Application source of truth. Dashboard consumes it via REST; never PostgreSQL directly. |
| DB | `apps/api/prisma/schema.prisma` (Data Model v2 locked, 12 models, UUID PKs, translation tables, JSONB content) | Persistence baseline. Gaps requiring migrations are tagged `DB REQUIRED`. |

Architecture (locked):

```text
Dashboard (Next.js)
  → REST API (/api/v1)
    → NestJS
      → Prisma
        → PostgreSQL
```

The dashboard never uses Prisma directly, never holds editable copies of articles/opinions outside API state, and never becomes a second editorial source.

## Reading order

1. `README.md` (this file) — orientation.
2. `dashboard-overview.md` — product definition, P0/P1/P2/P3 scope.
3. `gap-matrix.md` — Mockup vs Dashboard vs API vs DB at a glance.
4. `information-architecture.md` — navigation tree.
5. `ui-ux-specification.md` — visual language to migrate.
6. Deep modules (priority): `articles.md`, `editorial-workflow.md`, `permissions.md`, `revisions.md`, `scheduling.md`, `media.md`.
7. Supporting: `opinions.md`, `planning.md`, `analytics.md`, `notifications.md`, `audit-log.md`, `seo.md`.
8. `migration-strategy.md` then `roadmap.md` — how and in what order to build.

## What is defined vs pending

Defined: product scope, IA, UX spec, editorial workflow state machine (matches `src/common/transitions.ts`), RBAC target vs current, articles/opinions/media behavior, scheduling/revisions/audit concepts, SEO editorial controls, migration strategy, incremental roadmap with DoD.

Pending (`OPEN DECISION` in individual files): final pagination defaults, server search ranking strategy, scheduling executor (cron vs queue), revision retention policy, analytics backend (none exists), notification channels, planning data model, distribution scope.

## Status tags used everywhere

`EXISTS` — verified in code. `PARTIAL` — exists but incomplete. `MISSING` — no implementation. `MOCK ONLY` — only in mockup. `UI/UX ONLY` — no backend needed. `API REQUIRED` — needs new endpoint. `DB REQUIRED` — needs migration. `OPEN DECISION` — decision not taken.

## Constraints of this phase

- No changes to `apps/dashboard`, `apps/api`, Prisma, PostgreSQL, or the mockup were made.
- No dependencies installed, no migrations, no commits/push/PR.
- Only files inside `docs/dashboard/` were created.
- This documentation precedes migration. Do not start Increment 0 until explicitly authorized as a new task following Plan → authorize → Build → Test → Validate → Report → Stop.
