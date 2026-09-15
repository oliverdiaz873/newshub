# Analytics

## 1. Status

Event analytics `MISSING` (no `view|impression|click|popular` tables/endpoints). Only available signal: `category.articleCount` (published count, `categories.service.ts:90,110`). Mockup Home KPIs (Drafts/Published/Featured/Breaking + weekly bars + ES/EN donut + activity + review queue) are SIM numbers over `mock.js` — layout D-UX, data SIM.

## 2. Two tiers (do not conflate)

### Tier 1 — Available now (no new backend)

Computed from existing list endpoints (`GET /editorial/articles|opinions`, `GET /editorial/categories`):

- Status counts (drafts/review/published/archived), curation counts (featured/breaking), locale coverage (`es` vs `es+en` vs missing EN), per-category published counts, publishing activity (from `createdAt/updatedAt/publishedAt`), review-queue age.
- Overview wires these first. Weekly bars use publish-week buckets client-side; donut uses translation presence. Trends stay static until event data exists — never fabricate deltas.

### Tier 2 — Requires future infrastructure (`API REQUIRED + DB REQUIRED`)

Article views, top articles, traffic by category, content performance, editorial productivity (time-in-review, publishes per author), language distribution of reads. Needs event ingestion (storefront beacons → API → aggregate tables), privacy review, and retention policy — all `OPEN DECISION`. Chart library choice (`OPEN DECISION`; mockup settings proposes CSS vs Chart.js — proposal: CSS/SVG for Tier 1, evaluate Chart.js only when Tier 2 series need it).

## 3. UI obligations

KPI cards (count + label + honest trend slot marked `pending events` when unavailable), bars/donut as pure CSS/SVG (mockup pattern), review queue with age, loading/empty/error demos preserved. Every metric labels its source tier so editors never mistake computed counts for readership.
