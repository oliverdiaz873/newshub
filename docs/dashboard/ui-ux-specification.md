# UI/UX Specification (migration reference — mockup is visual truth)

Source: `newshub-dashboard-mockup` (`app.css`, `app.js`, `i18n.js`, `pagination.js`, `sortable.js`, `bulk.js`, `store.js`, `dirty.js`, `validate.js`, per-page `NH_PAGE_I18N`) + `README.md` theme/i18n notes. Dashboard baseline (pre-Inc 0): `apps/dashboard/src/app.css` (single accent `#dc3545`, `.nh-card/.nh-btn/.nh-table/.nh-error/.nh-field`, no dark mode, no `@media`). Status through Inc 5: shell/theme/i18n/tables/lists/editors/media ported (see matrix notes below); mockup stays the visual truth for anything not yet migrated.

## 1. Layout / shell (D-UX — preserve)

- Sidebar: brand `assets/img/logo4.jpeg`, `nav.manage/system` groups, active via `body[data-page]+data-nav`, static `.count` badges (wire to real counts in Increment 0), footer env-note. Mobile drawer (`body.nav-open+.scrim`, Esc/focus trap) + desktop collapse (`localStorage[nh-mockup-sidebar]`, `?sidebar=` override, injected `.side-toggle`).
- Topbar: `menu-btn[data-menu]`, `#global-q` proxying to `[data-f=q]` (debounce 300 ms, Enter immediate, × clear), `theme-toggle-slot`, `.locale-toggle`, `.user-chip` (today static `EM/Elena Marín/editora` — wire to `GET /auth/me`).
- Breadcrumbs: `Home / Section [/ Create|edit]`, `aria-current` on leaf. Only `index` uses `nav.home` alone.
- Surfaces/spacing/typography: migrate mockup tokens; current dashboard `.nh-shell{max-width:960px}` + `.nh-row{flex-wrap:wrap}` is insufficient — add container scale + table scroll regions.

## 2. Theme (D-UX — replicate exactly)

`<head>` anti-flicker + `app.js:7-104`: `localStorage[newshub-theme]` + `prefers-color-scheme` fallback, `[data-theme/data-theme-preference]`, `colorScheme`, 180 ms transitions honoring `prefers-reduced-motion`, cross-tab `storage` sync, Sun/Moon/System SVGs. Storefront tokens (`theme.css`): dark bg `#1a1a1a`, surfaces `#242424/#2d2d2d`, borders `#404040/#4a4a4a`, text `#e0e0e0/#a0a0a0`, accent `#dc3545`. Login reuses via `theme-toggle-slot`. Ported in Increment 0 (`ThemeProvider` + server-safe anti-flicker script + cycle toggle + `:focus-visible` + reduced-motion, H0).

## 3. i18n (D-UX pattern; backend EXISTS)

Mockup: single pref `nh-mockup-locale` (default `en`), `?lang=` override, `data-i18n/html/ph/aria + toast-i18n/confirm-i18n`, `NH_rerender()` for JS rows, `sortable.refreshAll()+repaintTheme`. API data model bilingual `es` (required) + `en` (optional) with `?locale > Accept-Language > es` + `fallback:true` (`common/locale.ts`, editorial DTOs). Ported in Increment 0 with `next-intl` (decision closed): UI locale `newshub-locale` (default `es`, persisted, `lang` attr sync, cross-tab) strictly separated from editorial preview language (`newshub-preview-lang` → API `?locale=`); data tabs ES-required/EN-optional.

## 4. Tables (D-UX structure; data SIM → API)

- Articles: check + Title/slug + Status + Category + Curation + Languages + Updated + Actions; badges `b-draft/published/archived/es/en/cat/featured/breaking`; row attrs `data-row/status/extra/extra2/hay`.
- Row actions: Edit → edit page; Publish → `POST :id/publish`; Archive → confirm dialog; Delete → confirm + `DELETE`. Never invent transitions outside `transitions.ts` matrix.
- Categories (`Label/slug, Desc, Pieces, Lang`) and Authors (avatar initials, Bio, Pieces, Lang): `q`-only filter + pager today; keep shell, wire Pieces to `articleCount` (categories `EXISTS`) and author counts (`API REQUIRED` for consistent counts).
- Opinions deliberately omit bulk checkbox (D-UX decision — keep).

## 5. Search / filters / sort / pagination (D-UX → server wiring)

- Filters: toolbar `data-filter-table`, `q` (mockup searches title/slug/cat/author debounced) + `status:all/draft/published/archived` + `extra:all/featured/breaking` (articles). Server today: `?q` (title/summary only, `ILIKE+unaccent`, no rank), `?status` (editorial DTOs), `?breaking/?featured` (articles only), `?category/?author`. Gap: server cannot search category/author names or content — document as `PARTIAL`; UI must not promise it.
- Sort: `th[data-sort]` buttons, cycle `none→asc→desc→none`, `aria-sort`, `↕/▲/▼`, `?sort=` deep link, applied pre-paginator. Server only `publishedAt:desc|asc`. Never put `data-i18n` on sortable `th` (uses `labelKey`). `OPEN DECISION`: extend server sort vs client-only secondary sort.
- Pagination: `Showing a–b of c`, prev/nums/next. Ported (Inc 1/3/4): `Paginator` with server `meta`, `Per page [10,20,50]` persisted per surface, default 20 (decision closed).
- Bulk (`bulk.js`): `#tbl-bulk/bar/count/master`, ID-based selection surviving filter/sort/page, `?select=` hook, actions publish/unpublish/archive/delete + delete confirm. Ported (Inc 1) with server `POST /articles/bulk` (decision closed) + `reject` (Inc 2) + per-item code summary.
- Global `#global-q`: filters current view only, not route search — preserve.

## 6. Forms / validation / dirty-guard (D-UX — port verbatim logic)

- Tabs `data-tabs` ES-required/EN-optional + `data-pane es/en`. Fields: ES slug/title/summary/content + side Status/Category/Author/Cover(`coverMediaId` + preview)/Breaking/Featured + Unpublish/Archive/Restore. Category/Author/Cover selects hardcoded in mockup → wire to `/editorial/categories`, `/authors`, `/media`.
- `validate.js:attach`: `required` slug/title/summary + `slug:/^[a-z0-9]+(-[a-z0-9]+)*$/`, blur-validate, input re-check if flagged, submit capture-phase `preventDefault+stopImmediatePropagation`, focus first invalid, `val.required/slug` dict, EN exempt. Register validate before `dirty.watch`.
- `dirty.js:watch`: value snapshot (excludes hidden/file/theme/lang), `Unsaved changes` flag, Discard Stay/Leave confirm, Save/Publish `[data-dirty-clean]` rebaselines, `beforeunload`, `?dirty=1` demo. Keep on all edit pages.
- Categories/authors inline forms lacked validation wiring at baseline — ported (Inc 3) with article-grade validation + `slug_taken` (409) surfacing.

## 7. Media (D-UX grid/filter; thumbs SIM)

Grid `#media-grid` (name/meta/tag, Copy URL toast, Delete confirm, `#media-q` name/tag debounce), cover-usage card (`3/6 linked`, `media_in_use` blocks delete). Ported (Inc 4): manager grid with real absolute-URL thumbs, Copy-URL (clipboard + fallback), client `q` filter with honest hint, input+preview upload mirroring server rules (`MAX_FILE_BYTES`, sharp MIME match, `media_in_use` 409); shared `MediaCard` with `MediaPicker`. Full spec in `media.md`.

## 8. Home / KPIs (D-UX layout; numbers SIM)

4 KPI cards + review queue + locale coverage + activity (Inc 0: Tier-1 counts from `GET /editorial/*`, honest `pendingEvents` labels; Inc 2: quick Publish/Reject with KPI refetch; H0: opinions in queue). Charts (bars/donut/activity feed) remain P1 analytics scope (`API REQUIRED + DB REQUIRED` beyond computed counts).

## 9. Settings / Login (D-UX layout; persistence SIM)

Settings ported (Inc 0): session card, derived readonly API base, density + preview-language prefs (local-first). Login ported (Inc 0, H0): split brand layout, per-field errors, show/hide, no demo creds in prod; auth via `POST /auth/login` (HttpOnly refresh + `nh_access`), `me/refresh/logout`. No user management (API exposes none — correct to omit).

## 10. Cross-cutting states (D-UX)

Toasts (`ok` polite / `err` assertive regions), shared `ConfirmDialog` (zero `window.confirm`), skeletons/empty/error with retry, search ×-clear, stable API codes (`invalid_transition`, `slug_taken`, `media_in_use`, file errors). Responsive `380/820/1024px` + 44px touch targets ≤820px (Inc 0, H0, Inc 5). A11y: `:focus-visible`, modal/drawer focus contracts, keyboard tabs/picker, `prefers-reduced-motion`, contrast on `#dc3545` over dark surfaces.
