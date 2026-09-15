# Opinions

## 1. Status

Mirrors articles minus curation. Mockup list + edit (`opinions.html`, `opinion-edit.html`) `EXISTS` as D-UX; dashboard (Inc 3): server-wired list (`q` title/summary + status/author + `publishedAt` sort + pagination, default 20, no bulk by design) + `/opinions/[id]` + `OpinionEditor` (author required, shared `MediaPicker`, validation + dirty-guard, unpublish-first, full workflow incl. `reject`, scheduling picker in review); API `EXISTS` + `scheduledAt` (Inc 5); DB `EXISTS` (`Opinion`, `OpinionTranslation`, author `RESTRICT`, cover `SET NULL`, `scheduled_at/by` + index). No `isBreaking/isFeatured` on opinions (model + `OpinionsQueryDto` lack flags) — intentional parity gap, not a bug.

## 2. Behavior (target)

- List: Title/slug + Status + Author + Languages + Updated + Actions; `q` (title/slug/author, client-today; server title/summary only) + `status` filter + `publishedAt` sort + server pagination. No bulk checkbox (preserve mockup decision — opinions volume and sensitivity favor row actions).
- Editor (`/opinions/[id]`): tabs ES-required/EN-optional, `slug/title/summary/content`, side Author (required — `opinions.author RESTRICT` means delete blocked when opinions exist) + Cover (optional `No cover`) + Status + Unpublish/Archive (no breaking/category). Same `validate.js`+`dirty.js` wiring as articles; guest-byline note preserved from mockup.
- Transitions: identical matrix to articles (`publish/unpublish/archive/restore`, `PATCH` draft→review only, 409 `invalid_transition`). Author required; category absent.
- Delete: block with human copy when author-Restrict or cover-referenced analogues apply; confirm dialog always.

## 3. Gaps

`API REQUIRED` only for: author-name search, extended sort, usage counts, scheduling/revisions (shared with articles). No opinion-specific backend needed for P0 migration. `OPEN DECISION`: whether opinions ever gain curation flags (proposal: no — keep opinions distinct from breaking/featured news flow).
