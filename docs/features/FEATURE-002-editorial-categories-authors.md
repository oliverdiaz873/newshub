# FEATURE-002: Editorial Categories & Authors (F2)

Status: Implemented (F2, branch feature/f2-editorial-categories-authors)

## Description
Editorial management of categories and authors with ES/EN translations:
dashboard login + list/create/edit/delete, API CRUD with auth + RBAC,
slug uniqueness per locale (`409 slug_taken`), usable admin/editor seed.
No articles/opinions CRUD (F3), no publish actions (F4), no media upload (F5).

## Requirements
- Functional:
  - Login/logout/refresh per ADR-010 (own JWT + opaque rotating refresh).
  - Categories CRUD + translations; authors CRUD + translations.
  - `role admin|editor` enforced on every write (401 vs 403 strict); same
    content permissions for both roles in MVP (no admin-only distinction).
  - Translations contract: POST creates the entity with its initial
    translations set; PATCH updates only sent fields/translations (no
    full-replacement contract); ES must exist after the operation.
  - Validation: kebab slugs 3-120, required labels/names, valid locales.
  - Dashboard with login + lists + forms; `noindex`.
- Non-functional:
  - No public surface change; writes never touch `status`; audit
    `created_by/updated_by` filled from the authenticated user.
  - Secrets never logged; password hashes never serialized.
- Out of scope: articles/opinions, publishing, media upload, E2E app,
  public preview, sessions UI, password recovery, MFA, OAuth.

## Acceptance Criteria
- [x] Login with seeded editor works; wrong password → 401 `unauthorized`.
- [x] Editor AND admin can manage categories and authors.
- [x] Duplicate `(locale,slug)` → 409 `slug_taken`; invalid slug → 422/400;
      missing ES after write → 422.
- [x] Anonymous write → 401; public GETs unaffected.
- [x] Dashboard login + categories/authors lists + forms work via API
      (authors list is editorial `GET /authors` with auth, added in F2
      after approval — no public surface).
- [x] Unit + integration green (7 unit + 17 e2e).

## Design
- API: `auth` module (login/logout/refresh, guards, rate limits) +
  `POST/PATCH/DELETE /api/v1/categories`, `/authors`; thin repositories;
  mappers reused; credentials in `user_credentials`, refresh state in
  `refresh_tokens` (migration `0002`).
- Dashboard: minimal Next app (`/login`, `/categories`, `/authors`), API
  client with cookie credentials, Tailwind reuse, no new design system.
- Seed: admin/editor with documented dev passwords (dev only).

## Implementation Plan
1. Migration `0002` (credentials + refresh tables).
2. Auth module + guards/RBAC + rate limiting.
3. Categories CRUD + authors CRUD (+translations).
4. Dashboard scaffold + login + 2 CRUD screens.
5. Seed update + tests + gates + PR.

## Testing Strategy
- Unit: validators, mappers, RBAC guard matrix, token handling, rotation.
- Integration (supertest vs `newshub_test`): login/logout/refresh + rotation +
  reuse detection, 401/403, CRUD happy paths, 409 duplicates, 422 invalid,
  audit filled.

## Dependencies
ADR-009 (Accepted), ADR-010 (Accepted), Data Model v2, API Contract v1.1,
F1 infra (seed, e2e harness, local PG).

## Risks and Mitigations
- Auth scope creep → hard boundary: no sessions UI, recovery, MFA, OAuth.
- EN content quality → ES required, EN optional with fallback (unchanged).
- Dashboard polish drag → minimal functional UI; design deferred.
- Native password-hashing build issues → ADR-010 allows bcrypt fallback;
  report if taken.

## Notes
Preview pública stays out; drafts only via authenticated editorial reads.
Authors are independent entities; references from articles/opinions are F3.
