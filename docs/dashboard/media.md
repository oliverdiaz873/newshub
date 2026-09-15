# Media / DAM

Deep module. Backend core `EXISTS`; advanced DAM `MISSING`.

## 1. Current backend (verified)

- Model `MediaAsset{id, storageKey UNIQUE, mime, width, height, createdById, createdAt}` (`schema.prisma:161-174`); relations `Article.cover → SET NULL`, `Opinion.cover → SET NULL`, `opinions.author → RESTRICT`.
- `GET /media` paginated (guarded), `POST /media` multipart (5 MB `MAX_FILE_BYTES`, JPEG/PNG/WebP/AVIF only, sharp metadata + declared-MIME match, opaque key `<2-hex>/<uuid>.<ext>` under `MEDIA_DIR|storage/`), `DELETE /media/:id` (404 vs 409 `media_in_use` when referenced as cover), public `GET /media/:id/content` (`Cache-Control immutable`, 404 problem+json), view `{id,url,mime,width,height,createdAt}` with absolute URL via `coverUrl` (`media.service.ts`, `storage.service.ts:12-60`, `cover-url.ts`).
- Dashboard (Inc 4): manager grid (`/media`) with server pagination (default 20, deep-link), client `q` filter (honest hint; filtered counts shown), upload input + transient preview, Copy-URL (clipboard + fallback), `ConfirmDialog` delete, `media_in_use` human copy; shared `MediaCard`/`MediaThumb` with `MediaPicker` (picker conduct frozen). Mockup: grid (`#media-grid`, name/meta/tag, Copy URL, Delete confirm, `#media-q` name/tag), usage card (`3/6 linked`), upload preview + `>5MB→file_too_large` simulation.

## 2. Target behavior (P0 scope)

- Upload: drag-drop + file input, `accept` + client pre-check (type + 5 MB) + server as authority (never trust extension). Progress, preview (object URL pre-upload, absolute URL post-upload), metadata capture (dimensions from server response), error mapping (`file_too_large`, `Format not allowed`, `not readable`).
- Grid: real thumbnails via `GET /media/:id/content` (replace mockup gradient placeholders), name/meta (mime, dimensions, size when exposed — size not in view today, `OPEN DECISION`/`API REQUIRED` to add `bytes`), tag/filename search (`#media-q` pattern; server has no `q` on media — `OPEN DECISION`: client filter first, server `q` later).
- Selector: reusable picker for `coverMediaId` (used by article/opinion editors) with search + preview + `No cover` option + upload-from-picker. Single component shared by both editors (Increment 1).
- Preview/detail: full image, metadata (mime, dimensions, createdAt, createdBy when exposed), usage list (which articles/opinions reference it — needs `countReferences` exposure, `API REQUIRED` for usage detail beyond boolean), Copy URL (absolute), Delete with `media_in_use` blocking copy (show referencing titles when available, else generic).
- Deletion: confirm dialog; `media_in_use` (409) never force-deletes; storage file removed before row (`service.ts:99-101`) — orphans acceptable, broken refs not.
- Association: cover only today (`coverMediaId`); inline/body images are P2 (`OPEN DECISION`).

## 3. Gaps → requirements

| Need | Status | Requirement |
|---|---|---|
| Alt text library | `coverAlt` per translation only | Keep per-content `coverAlt` (exists); central alt catalog P2 |
| Variants/thumbnails/focal point | MISSING | P2 (`API REQUIRED + DB REQUIRED`); P0 uses originals |
| CDN/S3 | fs only (`StorageService` abstraction ready) | P2; keep abstraction |
| Usage detail | boolean only (`countReferences>0`) | `API REQUIRED` to list referencing content |
| File size in list | not in `MediaView` | `OPEN DECISION`: add `bytes` column+field |
| Media search `q` | MISSING server-side | `OPEN DECISION`: client-first |

## 4. UI obligations (port from mockup)

`#media-grid` card anatomy, `#media-q` debounce, upload preview region, usage card, toasts/confirm patterns, responsive grid (Inc 0 breakpoints + Inc 4 manager grid).

## 5. DoD (Increment: Media/DAM v1) — SATISFIED (Increment 4)

Upload→preview→metadata round-trip; `media_in_use` demonstrated with human copy; picker reused in both editors; thumbnails real; `type-check/lint/build` pass; a11y (file input label, dialog focus, alt text on previews).
