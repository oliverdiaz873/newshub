# Information Architecture

## 1. Target navigation tree

```text
Dashboard
├── Overview (KPIs, publishing activity, locale coverage, review queue)
├── Articles
│   ├── All
│   ├── Drafts (?status=draft)
│   ├── Review (?status=review)
│   ├── Scheduled (?scheduled — OPEN DECISION, requires API+DB)
│   ├── Published
│   └── Archived
├── Opinions (All / Drafts / Review / Published / Archived; no curation flags)
├── Planning (P1 — calendar, assignments, pitches; MISSING backend)
├── Media (grid, upload, detail, usage)
├── Categories
├── Authors
├── Analytics (P1 — counts first; events later)
├── Notifications (P1 — inbox + preferences; MISSING)
├── Audit Log (P1 — immutable event list; MISSING)
└── Settings (session, API base readonly, density, preview language, theme, locale)
```

Rationale: mirrors the mockup (`index, articles, opinions, media, categories, authors, settings`) plus the real dashboard routes, and adds P1 nodes (Planning, Analytics, Notifications, Audit Log) as first-class destinations so permissions, breadcrumbs, and review flows have stable URLs. `Scheduled` is a filtered Articles view, not a separate entity, pending scheduling backend.

## 2. Route mapping (target, Next.js App Router)

| Node | Target route | Current dashboard | API source |
|---|---|---|---|
| Overview | `/` | `EXISTS` (`app/page.tsx`) — minimal | `GET /editorial/articles|opinions` counts (client-computed first) |
| Articles All + status views | `/articles[?status=]` | `EXISTS` inline page, no `[id]` | `GET /editorial/articles`, `GET /editorial/articles/:id` |
| Article edit | `/articles/[id]` | `MISSING` (in-page `editing` state) | `POST|PATCH /articles/:id`, `POST :id/publish|unpublish|archive|restore` |
| Opinions | `/opinions`, `/opinions/[id]` | `EXISTS` list; `[id]` `MISSING` | `GET /editorial/opinions[/:id]`, writes on `/opinions/:id` |
| Planning | `/planning` | `MISSING` | `API REQUIRED + DB REQUIRED` |
| Media | `/media` | `EXISTS` list; detail `MISSING` | `GET /media`, `POST /media`, `DELETE /media/:id`, `GET /media/:id/content` |
| Categories | `/categories` | `EXISTS` | `GET /editorial/categories`, writes `/categories/:id` |
| Authors | `/authors` | `EXISTS` | `GET /authors[/:id]`, writes `/authors/:id` (no public list by design) |
| Analytics | `/analytics` | `MISSING` | Counts via existing lists first; events `DB REQUIRED` later |
| Notifications | `/notifications` | `MISSING` | `API REQUIRED + DB REQUIRED` |
| Audit Log | `/audit-log` | `MISSING` | `API REQUIRED + DB REQUIRED` |
| Settings | `/settings` | `MISSING` (mockup-only) | Session via `/auth/me`; prefs local-first |
| Login | `/login` | `EXISTS` (`app/login/page.tsx`) | `POST /auth/login`, `GET /auth/me` |

`OPEN DECISION`: whether Settings density/preview-language persist server-side (proposal: local-first, `NEW` backend only if cross-device needed) and whether Planning lives under `/planning` or inside Articles as a tab (proposal: top-level `/planning` for P1 to keep review workload visible).

## 3. Breadcrumbs and deep linking

Convention from mockup (D-UX): `Home / Section [/ Create|Edit]` with `aria-current` on leaf. Every list supports deep-linkable `?q=&status=&sort=&page=&limit=`; tables persist page-size (`nh-mockup-pagesize-<table>` pattern → migrate to server `limit` + local default). Sortable headers use `?sort=key:dir`. Bulk selection uses `?select=id1,id2` hook (mockup `bulk.js`) — preserve as shareable pattern once server bulk exists (`OPEN DECISION`: server bulk vs sequential calls in Increment 1).

## 4. What changes vs today

- Add `[id]` edit routes (replace in-page editing) — `UI/UX ONLY` + wiring to existing endpoints.
- Add `/settings`, `/analytics`, `/notifications`, `/audit-log`, `/planning` shells (empty states first, then P1 backends).
- Promote Overview from placeholder to KPI + review-queue hub (computed from existing list endpoints until analytics events exist).
- Keep `robots: noindex` and `X-Frame-Options:SAMEORIGIN` on all dashboard routes.
