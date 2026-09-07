# FEATURE-005: Media Upload & Storage (F5)

Status: Implemented (F5, branch `feature/f5-media`)

## Description
Image management for articles and opinions: upload behind `StorageService`
(local filesystem), metadata-only PostgreSQL, public immutable serve route,
editorial delete protection, dashboard `/media` + cover selectors, storefront
unchanged visually.

## Requirements
- Functional:
  - `POST /api/v1/media` (auth `admin|editor`, multipart `file`): JPEG, PNG,
    WebP, AVIF; 5 MB max (413 `file_too_large`); real parse validation via
    sharp (never extension alone); opaque server key (`uuid.ext` sharded);
    metadata row with `created_by` → `201 {id, url, mime, width, height}`.
  - `GET /api/v1/media` (auth, paginated) for selectors.
  - `GET /api/v1/media/:id/content` (public, `Cache-Control: public,
    max-age=31536000, immutable`, ETag): streams from disk; 404 when missing.
    `storage_key` is never exposed.
  - `DELETE /api/v1/media/:id` (auth): 409 `media_in_use` when referenced by
    any article/opinion (any status); file removed before row (orphans over
    broken references); 204 on success.
  - Cover assignment via `coverMediaId` on article/opinion create/PATCH
    (404 on unknown id); cover URL rule: legacy `/images/...` paths as-is,
    uploads resolve to the public media route.
  - Dashboard `/media` (upload + preview + list + delete) and cover
    dropdowns in article/opinion forms.
- Non-functional: no S3/CDN/thumbnails/workers/Docker; no legacy migration;
  F4 workflow untouched (uploads never publish anything).
- Out of scope: production/cloud storage (deferred ADR), thumbnails,
  optimization workers, legacy migration, public preview.

## Acceptance Criteria
- [x] Upload 201 with dims + absolute URL; fake image 422; MIME mismatch 422.
- [x] Oversize → 413 `file_too_large`; anonymous → 401.
- [x] Serve 200 with correct MIME + immutable cache; unknown id → 404.
- [x] Assigned cover resolves to `/api/v1/media/:id/content` publicly.
- [x] Delete referenced → 409 `media_in_use`; delete free → 204.
- [x] Dashboard upload/list/delete + selectors work via API.
- [x] Unit (storage keys/traversal, cover URL) + e2e green.

## Design
- `StorageService` owns all disk access; key regex + root containment guard
  against traversal; client filenames never touch disk.
- `coverUrl()` helper centralizes legacy-vs-uploaded resolution.
- `CacheControlInterceptor` skips already-sent responses (file streaming).
- 413 mapped by status (robust to whichever layer raises the limit error).
- `next.config.ts` `remotePatterns` derived from `NEXT_PUBLIC_API_URL`
  (absolute cover URLs in `next/image`); relative legacy paths unaffected.

## Implementation Plan
1. Deps (sharp, multer types) + `StorageService` + metadata endpoints.
2. Validation (sharp parse, allowlist, 5 MB, 413 mapping) + delete guard.
3. `coverUrl()` wiring + `remotePatterns` verification.
4. Dashboard `/media` + cover selectors.
5. Tests + gates + PR.

## Testing Strategy
- Unit: key opacity/traversal, URL rule.
- Integration: upload/serve/delete matrix, cover assignment + public
  resolution, 409/422/413/401/404 codes, anon guards.

## Dependencies
ADR-009/ADR-010, Data Model v2 (`media_assets`), API Contract v1.1, F1–F4.

## Risks and Mitigations
- Native sharp install → prebuilt binaries verified, no toolchain needed.
- tsx dev serves fresh code; prod uses tsc build (both validated).
- Orphan files on failed rows → acceptable by design, documented.

## Notes
Production storage (S3/CDN) gets its own ADR later; no code anticipates it
beyond the `StorageService` boundary.
