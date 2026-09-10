# ADR-012: Editorial Single Source of Truth (PostgreSQL → Prisma → NestJS API)

Status: Proposed
Date-Proposed: 2026-09-10
Owner/Deciders: Oliver (Arch) + agent (draft)
Refs: ADR-009 (dashboard app), ADR-010 (editorial auth), `apps/api/prisma/seed-data/`, `scripts/ssot-guard.mjs`

## Context

Newshub grew from a frontend-only site whose editorial content lived in
`apps/storefront/src/data/*`. The backend migration (F1–F5, A1.1–A1.3-B)
introduced PostgreSQL + Prisma + NestJS API (`/api/v1`) and moved seed
ownership to `apps/api/prisma/seed-data/*.json`, but the Storefront still
renders Home, categories, search, metadata/JSON-LD and related content from
local data, with a silent fallback to `src/data` whenever the API is
unavailable (`apps/storefront/src/lib/api.ts`). The audit at `dd449a5`
proved two independently editable representations of the same articles
already diverge. Without a recorded decision, every new feature risks
deepening the split.

## Decision

For editorial data:

```text
PostgreSQL
    ↓
Prisma
    ↓
NestJS API (/api/v1)
    ↓
Storefront / Dashboard (API clients)
```

- PostgreSQL is the persistence source of truth; the NestJS API is the
  only application-facing source of truth for editorial content.
- `apps/storefront/src/data/*` is a temporary quarantine, not a source.
  It must not be deleted until migration gates prove zero production
  consumers (G0–G4 in the migration plan).
- `API failure` must not eventually resolve to `stale local editorial
  data` in production. Legitimate HTTP/cache resilience (retries, ISR,
  error boundaries) is not a second source of truth; a static corpus
  standing in for the API is.

### Allowed frontend-owned data

- UI translations and labels (`src/i18n/locales/*`, no `data.*` keys)
- Navigation, theme, layout and presentation configuration
- Legal content explicitly kept frontend-owned (`legalContent.ts`)
- Type definitions (`newsModels.ts`) and pure helpers (`articleFactory.ts`)
- Tests, fixtures, loading/error states, client interaction state
- Brand/UI assets (logo, favicons, fonts, icons)

### Forbidden editorial duplication

- Articles, bodies, summaries, titles, slugs
- Editorial category content and labels served as content
- Opinions and opinion content
- Editorial ES/EN translations (`messages/data.*`)
- Editorial curation state (`featured`/`breaking` pools, ordering)
- Editorial media mappings (`/images/news|opiniones` as article imagery)

## Consequences

- Storefront migration proceeds route by route (detail → categories →
  search → Home → media → i18n cleanup → deletion), each gated.
- `scripts/ssot-guard.mjs` tracks violations as baseline debt (warn) and
  enforces the Prisma/`DATABASE_URL` boundary as a hard error; `--strict`
  becomes the F6 deletion gate.
- EN editorial comes from the API (`?locale` + fallback flag); the
  `[EN]`-prefix dictionary approach is retired with `messages/data.*`.
- `docs/architecture.md` must be rewritten to describe this decision;
  ADRs keep the *why*, architecture keeps the *how*.

## Alternatives Considered

- Keep the dual-source model permanently: rejected — divergences already
  observed; unpublish/Each locale would need double writes.
- Move editorial content to a headless CMS: rejected — out of scope;
  the NestJS API already models it.
- Mirror API content into `src/data` at build time: rejected — a cached
  copy that can be hand-edited is still a second source of truth.
