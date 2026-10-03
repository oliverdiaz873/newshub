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
├── Planning (calendar, assignments, pitches)
├── Media (grid, upload, detail, usage)
├── Categories
├── Authors
├── Analytics (counts first; events later)
├── Notifications (inbox + preferences)
├── Audit Log (immutable event list)
└── Settings (session, API base readonly, density, preview language, theme, locale)
```

Rationale: mirrors the mockup (`index, articles, opinions, media, categories, authors, settings`) plus the real dashboard routes, and adds P1 nodes (Planning, Analytics, Notifications, Audit Log) as first-class destinations so permissions, breadcrumbs, and review flows have stable URLs. `Scheduled` is a filtered Articles view, not a separate entity, pending scheduling backend.

## 2. Route mapping (target, Next.js App Router)

| Node | Target route | Current dashboard | API source |
|---|---|---|---|
| Overview | `/` | `EXISTS` (`app/page.tsx`) | `GET /editorial/articles|opinions` counts (client-computed first) |
| Articles All + status views | `/articles[?status=]` | `EXISTS` list + filters | `GET /editorial/articles`, `GET /editorial/articles/:id` |
| Article edit | `/articles/[id]` | `EXISTS` (`ArticleDetail` + editor) | `POST|PATCH /articles/:id`, `POST :id/publish|unpublish|archive|restore|reject` |
| Opinions | `/opinions`, `/opinions/[id]` | `EXISTS` list + `[id]` editor | `GET /editorial/opinions[/:id]`, writes on `/opinions/:id` |
| Planning | `/planning` | `EXISTS` (board, form, calendar, review queue) | `planning` CRUD + transitions + calendar + review-queue |
| Media | `/media` | `EXISTS` list; detail `MISSING` | `GET /media`, `POST /media`, `DELETE /media/:id`, `GET /media/:id/content` |
| Categories | `/categories` | `EXISTS` | `GET /editorial/categories`, writes `/categories/:id` |
| Authors | `/authors` | `EXISTS` | `GET /authors[/:id]`, writes `/authors/:id` (no public list by design) |
| Analytics | `/analytics` | `EXISTS` (Tier-1 counts) | Counts via existing lists first; events `DB REQUIRED` later |
| Notifications | `/notifications` | `EXISTS` (inbox + prefs) | Inbox/unread-count/prefs/read endpoints |
| Audit Log | `/audit-log` | `EXISTS` (filters + entity trail) | `/audit-log` list + `:entityType/:entityId` trail |
| Settings | `/settings` | `EXISTS` (shell + local prefs) | Session via `/auth/me`; prefs local-first |
| Login | `/login` | `EXISTS` (`app/login/page.tsx`) | `POST /auth/login`, `GET /auth/me` |

`OPEN DECISION`: whether Settings density/preview-language persist server-side (proposal: local-first, `NEW` backend only if cross-device needed) and whether Planning lives under `/planning` or inside Articles as a tab (proposal: top-level `/planning` for P1 to keep review workload visible).

## 3. Breadcrumbs and deep linking

Convention from mockup (D-UX): `Home / Section [/ Create|Edit]` with `aria-current` on leaf. Every list supports deep-linkable `?q=&status=&sort=&page=&limit=`; tables persist page-size (`nh-mockup-pagesize-<table>` pattern → migrate to server `limit` + local default). Sortable headers use `?sort=key:dir`. Bulk selection uses `?select=id1,id2` hook (mockup `bulk.js`) — preserve as shareable pattern once server bulk exists (`OPEN DECISION`: server bulk vs sequential calls in Increment 1).

## 4. What changes vs today

- Keep `robots: noindex` on all dashboard routes.
