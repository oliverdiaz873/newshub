# SEO (editorial controls)

## 1. Separation (critical)

- Storefront technical SEO (meta rendering, canonical, sitemap, structured data output, hreflang headers): not this folder's scope; dashboard never emits it.
- Dashboard editorial SEO controls (this file): the fields and completeness signals editors manage per item.

## 2. Controls per article/opinion (target)

| Control | Source today | Target |
|---|---|---|
| Title (`title`) | EXISTS (translations) | Required ES; EN optional; length guidance (UI hint, `UI/UX ONLY`) |
| Description (`summary`) | EXISTS | Required ES; length hint |
| Slug | EXISTS (unique per locale) | Format-enforced + `slug_taken` surfacing; uniqueness check affordance |
| Locale + translation status | EXISTS (`es` required, fallback flag) | ES/EN presence badges + missing-EN nudge (no blocking) |
| Image / OG image | `coverMediaId` + `coverAlt` EXISTS | Preview with alt-required nudge; dimensions check via media metadata |
| Publish date / updated date | `publishedAt` (first, immutable) + `updatedAt` EXISTS | Display First published + Last updated separately; scheduled date shown once scheduling lands |
| Canonical | MISSING concept | `OPEN DECISION`: derived from slug (proposal) vs editable field; no custom canonical in P0 |
| Structured-data considerations | none in dashboard | Checklist hints (type coverage by category) — `UI/UX ONLY`, P1 |
| Content completeness | none | Completeness meter (title/summary/cover/alt/EN present) computed client-side from existing fields — `UI/UX ONLY`, no backend |

## 3. Category/author SEO notes

Category `label/slug/description` + `sort` (EXISTS) feed listing pages; author `name/bio` per locale (EXISTS) feed bylines. No dashboard-side meta editing beyond these fields in P0.

## 4. Non-goals

No sitemap/RSS editor, no redirect manager, no keyword analytics (P2+ with analytics Tier 2), no AI title generation in P0 (P2 assist with human approval).
