# Articles

Status: IMPLEMENTED (list, editor, workflow, scheduling, revisions).
Table below keeps the original migration mapping; `MISSING` rows are
the pre-implementation state, kept as design history.

Deep module. Covers list, filters, editor, publishing actions, validation, bilingual model, and gaps.

## 1. Capability status

| Aspect | Mockup | Dashboard | API | DB | Target | Tag |
|---|---|---|---|---|---|---|
| List + status/curation filters | EXISTS | EXISTS (status+curation, no search) | EXISTS (`status`, `breaking`, `featured`, `category`, `author`) | EXISTS | Server-filtered list | `EXISTS` |
| Text search `q` | EXISTS (title/slug/cat/author, client) | EXISTS (server `q`, honest hint) | EXISTS (title/summary `ILIKE+unaccent`, no rank) | `unaccent` ext only, no FTS index | Server `q` first; document limits | `EXISTS` |
| Sort | EXISTS (title/status/category, client) | EXISTS (server `publishedAt` select) | EXISTS (`publishedAt:desc\|asc` only) | — | Server `publishedAt` + `OPEN DECISION` on extensions | `EXISTS` |
| Pagination | EXISTS (client slice, 5/10/25) | EXISTS (server `page/limit`, 10/20/50, default 20) | EXISTS (`page/limit`, max 100, `meta`) | — | Server pagination, keep visual paginator | `EXISTS` |
| Bulk publish/archive/delete | EXISTS pattern (SIM persistence) | EXISTS (`POST /articles/bulk`, per-item codes) | EXISTS (bulk endpoint, max 50, isolated per id) | — | Sequential calls first; bulk endpoint `OPEN DECISION` | `EXISTS` |
| Create/edit form (ES/EN tabs, cover, category/author) | EXISTS (SIM) | EXISTS (`/articles/[id]` + `/articles/new`) | EXISTS (`POST\|PATCH /articles/:id`, editorial read) | EXISTS (`articles`, `article_translations`) | Dedicated `/articles/[id]` route | `EXISTS` |
| Validation + dirty-guard | EXISTS (`validate.js`+`dirty.js`) | EXISTS (validate-first + dirty-guard ported) | 422 Spanish-required, `slug_taken` 409 | Unique `(locale,slug)` | Port mockup logic verbatim | `EXISTS` |
| Featured/Breaking | EXISTS (badges+filter) | EXISTS (checkboxes+filter) | EXISTS (+ partial indexes `WHERE status='published'`) | EXISTS (`is_breaking`, `is_featured`) | Keep; extend to opinions only in P1+ if justified | `EXISTS` |
| Scheduling | UI affordance only | EXISTS (`ScheduleSection`, review-only) | EXISTS (schedule/cancel + executor) | EXISTS (`scheduled_at/by`) | See `scheduling.md` | `EXISTS` |
| Revisions | MISSING | EXISTS (`HistoryPanel` list/View/Diff/restore) | EXISTS (`:id/revisions`, restore as new version) | EXISTS (`revisions`) | See `revisions.md` | `EXISTS` |

## 2. Functional behavior (target)

### 2.1 List (`/articles`)

- Query: `?locale=&status=draft|review|published|archived&category=&author=&breaking=&featured=&q=&sort=publishedAt:desc|asc&page=&limit=`. Deep-linkable; page-size persisted; page resets on filter/sort.
- Columns: selection + Title/slug + Status + Category + Curation + Languages + Updated + Actions (mockup order preserved).
- Badges: `draft/review/published/archived`, `featured/breaking`, `es/en`, category label.
- Selection: ID-based, survives filter/sort/page; `?select=` share hook; bulk bar with count; delete always confirms.
- States: skeleton loading, empty with clear-filters action, error with retry, toasts on actions mapping `invalid_transition` (409), `slug_taken`, network errors.
- `OPEN DECISION`: default `limit` (server default 20 vs mockup demo 5; proposal: 20).

### 2.2 Editor (`/articles/[id]`, `.../new`)

- Tabs ES (required) / EN (optional, inherits ES when empty). Fields per locale: `slug` (`/^[a-z0-9]+(-[a-z0-9]+)*$/`), `title`, `summary`, `content` (paragraph array via `splitParas` today; rich-text scope is `OPEN DECISION` — proposal: keep paragraph model for migration, rich text P2), `coverAlt`.
- Side panel: Status (read-only display + transition buttons, never free-edit), Category (required, from `GET /editorial/categories`), Author (optional, from `GET /authors`), Cover (`coverMediaId` select from `GET /media` + preview via absolute URL), `isBreaking`/`isFeatured` checkboxes, action row Unpublish/Archive/Restore per `transitions.ts` matrix.
- Wiring: `POST /articles` (create draft), `PATCH /articles/:id` (draft→draft no-op / draft→review only; published edits constrained — see `editorial-workflow.md`), `POST /articles/:id/publish|unpublish|archive|restore|reject` (idempotent `null→200 unchanged`, else 409). `publishedAt/firstPublishedAt` set once on first publish, never rewritten.
- Spanish-required: 422 when ES translation missing on create/publish (`requireSpanish`). EN exempt from required validation (mockup rule preserved).
- Dirty-guard + validation: port `validate.js`/`dirty.js` ordering (validate before dirty.watch), exclude hidden/file/theme/lang from snapshot, `beforeunload`, Stay/Leave confirm, rebaseline on Save/Publish.

### 2.3 Flags vs status (critical distinction)

Status ∈ `draft|review|published|archived` (state machine). Flags `isBreaking|isFeatured` are orthogonal curation booleans (articles only; partial indexes only accelerate `status='published'` filtered reads). UI must never render a flag as a status and never gate transitions on flags.

## 3. API/DB requirements for migration (satisfied; kept as history)

Existing coverage is sufficient for Increment 1: `GET /editorial/articles[/:id]`, `POST|PATCH|DELETE /articles/:id`, transition POSTs (incl. `reject`), bulk endpoint, `GET /editorial/categories`, `GET /authors`, `GET /media`. Later additions since (server bulk, scheduling, revisions) are covered by their own increments.

## 4. Quality gates / DoD (Increment 1 — satisfied)

List filters map 1:1 to server params with evidence; `limit=100` hardcode removed; search limits honestly documented in UI (no fake category/author/content search claims); `[id]` route replaces in-page editing; validation/dirty-guard ported; `invalid_transition` surfaced as human message; `type-check`, `lint`, `build` pass; responsive tables scroll without breakage; a11y (`aria-sort`, focus on first invalid, confirm dialog semantics).
