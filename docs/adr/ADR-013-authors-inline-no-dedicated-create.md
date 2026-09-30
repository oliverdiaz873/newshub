# ADR-013: Authors Keeps Inline Create/Edit (No `/authors/new`)

Status: Proposed
Date-Proposed: 2026-09-30
Owner/Deciders: Oliver (Arch) + agent (draft)
Refs: `apps/dashboard/features/authors/`, `apps/dashboard/app/authors/page.tsx`, `apps/api/src/modules/authors/`, `newshub-dashboard-mockup/authors.html`

## Context

After Inc1–Inc5, the Dashboard Authors section is complete with an inline
create/edit form (slug, ES name/bio, EN name/bio), validation + `slug_taken`
mapping, API error mapping, reviewer read-only, dirty guard + discard
dialog, focus management, busy states, search (name/slug/bio), URL sync,
10/20/50 pagination, Languages column, and 9/9 PASS E2E.

The question arose — prompted by the mockup's `New author` button — whether
Authors should gain a dedicated create page (`/authors/new`) like Articles
(`/articles/new`) and Opinions (`/opinions/new`).

## Decision

Authors keeps inline create/edit on `/authors`. No `/authors/new` route and
no dedicated create screen is created at this time.

## Alternatives Considered

1. **Inline form (current, chosen):** single `AuthorManager` card for create
   and edit, same five fields, same validation, guarded by role + dirty
   state. Consistent with Categories (FINALIZADA).
2. **Dedicated `/authors/new` page:** mirrors Articles/Opinions editors.
   Rejected — a second form surface with no additional capability (see
   Rationale).
3. **Create dialog/modal:** the mockup's own decision log proposes
   "dialog (fast)" for category/author creation. Rejected for now — the
   inline form already occupies one card above the list with identical
   reachability and fewer focus-trap concerns than a modal.

## Rationale

1. The mockup contains no `New author` screen: the button is a demo toast
   (`"Create author dialog (demo)."`), and no `author-edit.html` exists.
2. The mockup's decision log favors a fast dialog flow, not a page.
3. Author has five editorial fields (slug, ES/EN name, ES/EN bio), all short
   text; create and edit share one DTO and one form.
4. No current editorial complexity (no cover, categories, states,
   transitions, preview) justifies an independent route.
5. The inline form already solves validation, errors, dirty guard,
   discard, reviewer permissions, focus management, and post-save
   feedback.
6. Articles/Opinions use dedicated pages because of long-form content,
   covers, categories, editorial states, and preview — none present here.
7. A second surface would duplicate validation/labels/tests with zero
   functional gain.
8. Inline keeps consistency with Categories.

## Consequences

- One form implementation to maintain, test, and translate.
- No create/edit drift: both paths share validation, dirty baseline, and
  error mapping.
- Trade-off: if the form ever grows large, inline density must be
  revisited (see triggers).

## Revisit Triggers

Reconsider `/authors/new` (or a dialog) only if the Author model gains
substantial complexity, e.g. real avatar/media, social links, additional
editorial metadata, file upload, preview, or an author-specific workflow.
As a practical indicator (not a hard rule): ~8–10+ relevant fields or a
need the inline card cannot reasonably host.

## Mockup Alignment

Not creating `/authors/new` is not a deviation from the mockup: the
mockup implements no such page. The mockup's table-level `Pieces` and
avatar initials are display-only fixtures, handled below.

## Future Candidates (Require API Evolution — Out of Scope)

- `piecesCount` per author: the mockup shows it; the API exposes no
  count. Do not invent the number; keep `countsDeferred` until a proper
  API contract exists.
- Real avatar/media: `Author` has no avatar in the model/API; needs
  schema + DTO + storage + permissions work, plus editorial demand.
