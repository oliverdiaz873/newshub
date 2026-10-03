# ADR-017: Adopt OpenAPI as the Formal REST Contract via Code-First Generation

Status: Rejected
Date-Proposed: 2026-10-03
Date-Decided: 2026-10-03
Decided-By: Oliver (decision explicitly delegated to agent acting as senior reviewer)
Owner/Deciders: Oliver (Arch) + agent (draft)
Refs: `apps/api/src/main.ts` (global prefix `api/v1`), `apps/api/package.json`, `docs/architecture.md`, `docs/source-of-truth.md`, `apps/api/docs/business-rules.md`, `docs/features/FEATURE-004-publishing-workflow.md`

## Context

The Newshub API exposes approximately 86 endpoints across 12
controllers under `/api/v1`, consumed by three first-party clients
(Dashboard, Storefront, E2E). Request validation lives in 11 DTO files
(`class-validator`), error shapes in a single RFC7807 filter, and
business semantics in BR-001…BR-023 — but no formal,
machine-consumable contract exists: no OpenAPI document, no
`@nestjs/swagger`, no `openapi.json/yaml`, no generated clients
(verified by repository-wide search on `origin/main`).

Consequences observed in the current tree: Dashboard and Storefront
hand-maintain parallel request/response types (e.g. article payloads
duplicated against `CreateArticleDto` without its constraints), E2E
hardcodes routes, payloads, status codes, and error codes per spec,
and documentation has already drifted once (`FEATURE-004` allows
`draft → publish`; the implementation only allows `review →
published`). The contract is distributed across code, DTOs, business
rules, feature docs, and consumers, with no automated way to detect
the next divergence.

## Problem

How does Newshub keep a consumable, verifiable REST contract
synchronized between the API and its consumers as the system grows —
without adding a second manual source of truth that can itself drift?

## Decision

Newshub will adopt **OpenAPI as the formal representation of the
REST contract, generated automatically from the API code
(code-first)**. Concretely, once accepted, the API will produce a
generated `openapi.json` from its controllers, DTOs, guards, and
response shapes via `@nestjs/swagger`.

Layering (OpenAPI replaces none of these):

```text
Implementation          → API code (authoritative for behavior)
Formal API contract     → generated OpenAPI (projection of the code)
Business semantics      → Business Rules (BR-001…BR-023)
Architectural decisions → ADRs
Feature behavior        → FEATURES
```

## Source of Truth

Per `docs/source-of-truth.md` level 2 (persistence and API
contracts: PostgreSQL → Prisma → NestJS API behavior), the generated
OpenAPI document belongs at **level 2 as a projection of NestJS API
behavior** — binding for data and contracts, subordinate to the
implementation itself. If the generated document ever disagrees with
the running code, the code wins and the generation pipeline is at
fault, never the other way around.

Adopting this ADR therefore requires a follow-up edit to
`docs/source-of-truth.md` level 2 (naming the generated OpenAPI
artifact, who regenerates it, and the code-wins rule). That edit is a
**consequence of acceptance, not part of this proposal** — this ADR
only records the intent so the SoT change can be reviewed together
with the acceptance decision.

## Why Code-First

- The API already declares routes (controllers), constraints (DTOs +
  `class-validator`), access rules (guards + `@Roles`), and response
  shapes in code — the raw material for generation exists.
- The code is already the implementation authority
  (`source-of-truth.md` level 1); generating from it cannot create a
  competing manual truth.
- A separately hand-written specification would be one more
  prose surface to drift, exactly the failure mode this ADR exists
  to eliminate. This is an architectural fit argument, not a style
  preference.

## What OpenAPI Covers

Endpoints, HTTP methods, paths, path/query parameters, request
bodies, response schemas, status codes, Bearer auth security scheme,
RBAC metadata where expressible (roles per operation), error
responses including the stable domain codes (`slug_taken`,
`invalid_transition`, `media_in_use`, `restore_relation_invalid`,
…), pagination (`page`/`limit`, `{data,meta}`), locale parameters,
multipart media endpoints, public feeds, and admin webhook routes.

## What OpenAPI Does NOT Replace

Business rules, workflow semantics, editorial policies, complex
transition semantics (e.g. `draft → review → published` with its
idempotency and two-step-approval rationale), ADRs, technical debt,
operational procedures, and deployment rules. A transition may appear
in OpenAPI as statuses and codes, but the editorial rules behind it
stay in Business Rules and FEATURES.

## Generated Artifact

Conceptual pipeline only (not implemented here):

```text
NestJS application
        ↓
OpenAPI generation (@nestjs/swagger)
        ↓
openapi.json
```

Open decisions, explicitly left pending: whether the artifact is
committed or generated on demand, whether CI publishes it as an
artifact, and where consumers fetch it from. The default direction is
generation in CI with the artifact available for inspection, but the
exact mechanism is an implementation detail of Phase 4, not of this
decision.

## CI Validation

Future gate (not implemented here): generate the specification in CI,
compare against the committed baseline, and fail on unexpected
contract drift. This turns today's silent drift (e.g. the
FEATURE-004 divergence, only caught by human audit) into a loud,
mechanical failure at the PR that introduces it.

## Generated Types / Clients

A future consequence, not part of this decision: deriving TypeScript
types (and eventually clients) for Dashboard and Storefront from
`openapi.json` to replace the hand-maintained duplicates. Whether
generated types become mandatory is a **later decision** — this ADR
only establishes the contract source they would derive from. No
generation library is selected here; the project currently obliges
none.

## Versioning

`/api/v1` is the URL version (routing prefix, `main.ts`) and is
unchanged by this ADR. `API Contract v1.1`, referenced across FEATURE
docs and ADRs, is a nominal label with no versioned artifact behind
it. The OpenAPI document version (spec revision) is a third,
independent number: it versions the *description*, not the API. No
versioning strategy is introduced here; a future contract change may
require one, decided then.

## Security

The generated document must describe only what consumers need:
endpoints, schemas, and the Bearer security scheme. It must never
embed secrets, environment values, JWT secrets, database credentials,
or internal infrastructure details. Security posture itself
(JWT rotation, RBAC, throttling, CORS) is documented in
`docs/security.md` and unaffected by this ADR.

## Alternatives Considered

1. **Stay with Markdown + DTOs + code (status quo):** rejected as
   the long-term posture — zero adoption cost and sufficient while
   the team is one human plus repo-local agents, but drift is silent
   (already observed once), consumer types stay duplicated by hand,
   external onboarding stays poor, and no tooling can validate the
   contract.
2. **OpenAPI code-first (this proposal):** generation cost up front
   (one dependency, DTO/controller decorators, generation pipeline),
   then near-zero marginal maintenance; drift becomes a CI failure;
   consumers can share generated types.
3. **OpenAPI design-first:** rejected — writing the spec by hand
   before code creates a second manual truth that must be kept in
   sync with an already-authoritative implementation; justified only
   if external consumers needed a contract before the API exists,
   which is not Newshub's situation.

## Consequences

Positive:

- A formal, tool-consumable contract for ~86 endpoints.
- Contract drift becomes a mechanical CI failure instead of an
  audit finding.
- Generated consumer types can progressively replace hand
  duplicates in Dashboard and Storefront.
- Better onboarding for future humans and agents.
- Traceability: contract changes point at the PR that introduced
  them.

Negative:

- One more production dependency (`@nestjs/swagger`) to audit and
  maintain.
- Decorator metadata across DTOs and controllers (noise + review
  burden until coverage is complete).
- Incomplete or wrong decorators give a false sense of
  completeness; the spec is only as honest as its annotations.
- Generation pipeline and baseline must be maintained; a brittle
  comparison could make CI noisy.
- Initial coverage work before the contract is trustworthy.

## Migration / Adoption Strategy

Phases only — not implementation, and not started:

```text
Phase 1  This ADR (closed as Rejected; phases below unstarted)
Phase 2  Install @nestjs/swagger (dependency + audit baseline)
Phase 3  Decorate DTOs and controllers
Phase 4  Generate the specification (artifact location TBD)
Phase 5  CI validation gate (generate, compare, fail on drift)
Phase 6  Generated consumer types for Dashboard/Storefront
Phase 7  Progressively remove hand-duplicated manual types
```

## Risks

- Partially decorated DTOs producing a spec that looks complete
  but is not.
- Wrong decorators silently misdescribing constraints the code
  enforces differently.
- Generated types diverging if the pipeline (not the code) is
  wrong — mitigated by the code-wins rule in SoT level 2.
- Business rules mistaken as "covered" because an endpoint is
  described; OpenAPI describes shape, not editorial semantics.
- Internal details (schemas, admin routes) leaking into a document
  treated as public without review.
- Decorator noise slowing API reviews; brittle CI comparison
  blocking unrelated PRs.

## Non-Goals

GraphQL; API redesign; changing `/api/v1`; changing NestJS;
changing the DTO architecture; microservices; API gateway;
replacing Business Rules, ADRs, or E2E; rewriting consumers now;
selecting a client-generation library.

## Decision Outcome (Rejected)

Senior review finds the proposal technically sound but mistimed for
this project. Rejected — not postponed as a TODO, but discarded as a
direction unless the revisit triggers below occur:

- **No external consumers.** Dashboard, Storefront, and E2E are
  maintained by the same single maintainer in the same monorepo.
  OpenAPI pays off when independent consumers need a stable,
  versioned contract; here the consumer and the API change in the
  same PR by the same person.
- **Cost is immediate, benefit is speculative.** Adoption means a new
  production dependency, decorator coverage across 11 DTOs plus
  controllers, a generation pipeline, and a maintained baseline —
  against a drift problem that has materialized exactly once
  (FEATURE-004) and was caught by human audit.
- **Project is entering a pause.** Committing to a new contract
  layer plus its maintenance right before pausing development would
  leave a half-adopted mechanism — worse than none.
- **Cheaper mitigations cover the real risk.** The observed failure
  mode (prose docs drifting from code) is already addressed by: the
  SoT rule (code wins, `docs/source-of-truth.md`), E2E suites as
  executable contract (46 Playwright tests + 14 API e2e specs), and
  the per-PR docs-consistency expectation.

Chosen alternative: keep the prose + DTO + E2E contract (Option A),
and on every API change keep updating the affected FEATURE/BR lines
as part of the same PR.

Revisit triggers (any one reopens this as a new ADR, never by
editing this file): a first external API consumer appears; a second
drift incident escapes to `main`; the maintainer team grows beyond
one human; or development resumes at full pace with API expansion.

## Scope

This ADR decides the contract direction only. It changes no code,
no dependencies, no CI, no DTOs, no controllers, no SoT text, and
accepts no implementation work. Everything in Migration remains
unstarted until acceptance.
