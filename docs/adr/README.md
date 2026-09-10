# ADR Index

Decision log for Newshub. Source templates live in
`software-engineering-workflow/templates/`.

| ID | Title | Status | Date | Superseded by |
|----|-------|--------|------|---------------|
| ADR-009 | Dashboard as separate Next.js app | Accepted | 2026-09-06 | — |
| ADR-010 | Editorial authentication & authorization | Accepted | 2026-09-06 | — |
| ADR-011 | Dashboard access-token storage & silent restore | Accepted | 2026-09-09 | — |
| ADR-012 | Editorial single source of truth | Proposed | 2026-09-10 | — |

## Status Legend

- **Proposed**: drafted, awaiting explicit approval by Oliver. The agent may
  investigate, analyze, draft and recommend, but never mark Accepted.
- **Accepted**: explicitly approved; implementable.
- **Rejected**: discarded with rationale + chosen alternative.
- **Superseded**: replaced by a newer ADR (linked); file is kept as history.

## Rules

- `Proposed → Accepted` only by Oliver's explicit approval, recorded with
  date + approver above.
- A superseded ADR keeps its file; its Status line points to the replacement
  and this index is updated on both rows.
- ADRs document *why*; `docs/architecture.md` documents *how it works now*;
  never duplicate — link instead.
