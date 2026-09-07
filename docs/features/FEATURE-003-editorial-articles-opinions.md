# FEATURE-003: Editorial Articles & Opinions (F3)

Status: Implemented (F3, branch `feature/f3-editorial-articles-opinions`)

## Description
Editorial CRUD for articles and opinions with ES/EN translations: dashboard
screens plus API endpoints, draft-only creation (F4 owns transitions),
category/author association, optional cover by existing media id, slug
uniqueness per locale (`409 slug_taken`), audit from the authenticated user.
No publishing actions (F4), no media upload/selection UI (F5).

## Requirements
- Functional:
  - `POST/PATCH/DELETE /api/v1/articles`, `/api/v1/opinions` with auth +
    RBAC `admin|editor` (same content permissions, no admin-only split).
  - Editorial reads: `GET /api/v1/editorial/articles[?status&category&author&q]`,
    `GET /api/v1/editorial/articles/:id` (same for opinions) with auth;
    full translations for edit forms.
  - Translations contract: POST creates with initial set; PATCH updates sent
    fields/translations only; ES must exist after the operation.
  - Creation always `draft`; any other `status` input → 422.
  - Category required for articles; author optional (articles) / required
    (opinions); cover optional by existing media id (404 if unknown).
  - Dashboard `/articles` + `/opinions`: lists with status, bilingual forms
    (content as blank-line-separated paragraphs), category/author selects.
- Non-functional:
  - Public surface unchanged: drafts invisible in public lists/details.
  - Secrets never logged; hashes never serialized; 401 vs 403 strict.
- Out of scope: publish/unpublish, media upload, public preview, scheduling,
  co-authorship, comments, central E2E app.

## Acceptance Criteria
- [x] Editor creates article/opinion drafts (201, `status: draft`).
- [x] Drafts invisible on public list/detail (404).
- [x] Duplicate `(locale,slug)` → 409 `slug_taken`; invalid body → 400;
      missing ES → 422; non-draft status → 422; unknown refs → 404.
- [x] PATCH adds EN translation partially; DELETE removes; unknown id → 404.
- [x] Anonymous writes → 401; public GETs unaffected.
- [x] Dashboard lists + bilingual create/edit work via API.
- [x] Audit `created_by/updated_by` filled from JWT (asserted in e2e).
- [x] Unit + integration green.

## Design
- Reuses thin repositories + `DtoPipe` (explicit DTOs, dev/prod parity),
  `slug_taken` envelope code, reference-before-conflict check order
  (404 refs before 409 slugs).
- Editorial namespace keeps public/editorial surfaces separated; no model
  or migration change (schema already supports F3).
- Dashboard reuses `AuthProvider`/`apiFetch`; no new design system.

## Implementation Plan
1. Editorial reads (`/editorial/*`, auth, filters).
2. Articles/opinions CRUD (draft-only, ES required, 409, audit).
3. Dashboard `/articles` + `/opinions` screens.
4. Seed unchanged (credentials from F2); tests; gates; PR.

## Testing Strategy
- Unit: validators, guard matrix, locale/pagination helpers.
- Integration (supertest vs `newshub_test`): editorial reads (auth/anon),
  CRUD lifecycles, 409/422/400/404 matrix, draft invisibility on public
  surface, audit fields, EN partial PATCH, opinion author rules.

## Dependencies
ADR-009/ADR-010, Data Model v2, API Contract v1.1, F1/F2 infra.

## Risks and Mitigations
- Curated list ordering vs API ordering → detail bodies API-driven, curated
  compositions stay local (F1 scoping note, unchanged).
- Content textarea UX → documented blank-line split + non-empty validation
  (DB CHECK backstop).
- esbuild decorator-metadata gap → explicit `DtoPipe` everywhere (F2 fix).

## Notes
`GET /authors` editorial (auth, added in F2 after approval) powers author
selects; no public authors surface. Cover selection UI deferred to F5.
