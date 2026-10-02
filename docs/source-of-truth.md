# Source of Truth

Central reference for what counts as authoritative in Newshub, in which
order, and what to do when sources disagree. It formalizes rules already
stated across `docs/architecture.md`, `docs/adr/README.md`,
`docs/technical-debt.md`, and the feature rulebooks — it introduces no
new architecture.

## Authority hierarchy

When sources conflict, the higher level wins. Lower levels must be
brought into line, never the other way around.

| # | Source | Authority | Use it for |
|---|--------|-----------|------------|
| 1 | Current implementation on `origin/main` (code, config, migrations) | Highest — the system as it operates | What the system **does** |
| 2 | Persistence and API contracts: PostgreSQL schema → Prisma models → NestJS API behavior; business rules BR-001…BR-023 (`apps/api/docs/business-rules.md`) | Binding for data and contracts | What the system **must do** with data and API responses |
| 3 | `Accepted` ADRs (`docs/adr/`) | Binding for the decisions they record | **Why** a decision was taken |
| 4 | Current specialized documentation (`docs/architecture.md` for how-it-works-now, `docs/features/`, `docs/dashboard/`, `docs/storefront/`, `apps/api/docs/`, `apps/e2e/docs/`, runbooks) | Canonical detail **for its own area only** | How a part works, without duplicating other sources |
| 5 | `Proposed` ADRs | Direction under review — never authoritative over levels 1–4 | What is being considered |
| 6 | Historical material (`Superseded` / `Rejected` / `Deprecated` / `STALE` docs, merged branches) | Context only — never authoritative | What was tried, decided against, or replaced |

Notes on existing rules, preserved as-is:

- PostgreSQL is the persistence source of truth; Prisma mirrors it; the
  NestJS API is the sole application-facing source of truth; frontends
  never access the database directly (ADR-012, `docs/architecture.md`).
- ADRs document *why*; `docs/architecture.md` documents *how it works
  now*; specialized docs are canonical for their area — link, never
  duplicate (`docs/adr/README.md`, `docs/folder-structure.md`).
- `docs/technical-debt.md` records only what was deliberately deferred;
  listing an item never approves its implementation.
- A `Proposed → Accepted` transition happens only by Oliver's explicit
  approval, recorded with date + approver (`docs/adr/README.md`).

## Conflict resolution

### Code vs documentation

Current code (level 1) is the operating state; the document is
potentially outdated. Do not change code to match the document. Flag
the document for update and keep working from the code.

### Code vs `Proposed` ADR

A `Proposed` decision is not implemented architecture. Distinguish:

```text
Proposed decision ≠ current implementation
```

Follow the implementation; treat the ADR as a proposal awaiting
approval. Never mark it `Accepted` yourself.

### Code vs `Accepted` ADR

This is an **architecture inconsistency**. Do not fix it silently in
either direction: do not reshape code to the ADR, and do not rewrite
the ADR. Stop, report the inconsistency with evidence (file paths,
commit/PR, observed behavior), and wait for a decision.

### Historical and `STALE` material

Historical, `Deprecated`, `Superseded`, `Rejected`, and `STALE`
material must be identifiable as such (status line + link to the
replacement where one exists) and must never compete with current
sources. A merged branch with no marker is history, not guidance.

### Documented but not implemented

Documenting a feature does not mean the feature exists. A decision
documented but not yet implemented (e.g. an ADR whose gates are
pending) has no operational authority until the code implements it.

## Document states

| State | Meaning |
|-------|---------|
| `Documented` | Written down somewhere — claims nothing about truth |
| `Implemented` | Present in current code on `origin/main` |
| `Verified` | Implemented **and** confirmed by evidence (tests, CI, live check) |
| `Current` | Describes the system as it is now |
| `Historical` | Describes a past state; context only |
| `Proposed` | Drafted, awaiting Oliver's explicit approval |
| `Accepted` | Explicitly approved; implementable/binding |
| `Rejected` | Discarded, with rationale and chosen alternative |
| `Superseded` | Replaced by a newer decision (linked); kept as history |
| `Deprecated` | Still present but scheduled for removal; do not extend |
| `STALE` | Known-outdated; code and ADRs are correct instead |
| `Deferred` | Real issue, deliberately postponed with evidence and revisit condition |

## Agent and developer protocol

Before modifying the project:

```text
1. Inspect the current implementation.
2. Check the relevant contracts (level 2).
3. Check Accepted ADRs (level 3).
4. Check specialized documentation (level 4).
5. Check technical debt for deliberate deferrals.
6. Check for STALE / historical material and exclude it.
7. Detect contradictions between the above.
8. Stop and report when authority is ambiguous.
```

Never resolve a contradiction silently. Report it with file paths and
observed behavior, then wait.

## Change rule

When a change touches architecture, contracts, significant behavior,
security, structure, workflow, or an architectural decision:

```text
Code change
→ identify affected documentation
→ update that documentation
→ validate consistency (no new contradictions, states still accurate)
```

Keep the update proportional: a minor change needs a clear commit and
touched-up docs; an architectural, contract, or behavioral change needs
commits, PRs, ADRs, or debt records matching its impact. Documentation
must not go stale the moment a feature lands.
