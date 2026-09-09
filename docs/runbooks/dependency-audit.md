# Dependency Audit Record (H5) — 2026-09-09

Batch treatment, no blind `npm audit fix`. Baseline vs result are
High/Critical counts from `npm audit` per app (`e2e` was already clean).

## Baseline → result

| App | Before | After |
|---|---|---|
| api | 7 high | 3 high |
| storefront | 6 high, 1 critical (+2 low, 1 mod) | 3 high (+2 low, 1 mod) |
| dashboard | 2 high, 1 critical | 0 |
| e2e | 0 | 0 |

## Batches applied

- **Lote 1 — next `16.2.6` → `16.3.4`** (storefront + dashboard, incl.
  `eslint-config-next` in sync): cleared the `next` critical and the
  `postcss`/`sharp`/`nanoid` highs. Gates: lint + type-check + `next build`
  on both apps, green.
- **Lote 3 — multer `2.2.0` → `2.3.0`** via `overrides` in `apps/api`
  (`@nestjs/platform-express` pins `2.2.0` exactly): cleared GHSA-wc9g-mqfw
  (multipart DoS, prod-relevant F5 upload path). Gates: API lint +
  type-check + unit 45/45 + e2e 34/34 (incl. media upload), green.

## Accepted-risk exceptions (documented, not forced)

- **Storefront `brace-expansion`, `browserslist`, `js-yaml` (high):**
  dev/build-time only — `npm audit --omit=dev` reports 0 high/critical.
  Fixing needs parent bumps or `overrides` with regression risk; DoS
  advisories require attacker-controlled input at build time. Revisit if
  they ever reach the prod tree.
- **API `prisma → @prisma/config → deepmerge-ts` (high, stack
  exhaustion):** reachable in the prod tree but only exercised when
  merging developer-controlled Prisma config (no attacker input in our
  threat model). The fix line requires Prisma major 7/8 (breaking) —
  deferred, no majors per H5 rules. Installed: prisma `6.19.3`.
- **`@nestjs/*` suspicious range (`>=7.6.0-next.1`, fix pointed at major
  `7.5.5`):** no longer reported after the Lote 1/3 tree refresh —
  treated as audit artifact, no action. Reopen if it reappears with a
  concrete advisory.

## Deferred

~~`npm audit --omit=dev` as a blocking CI gate: evaluate once the above
exceptions are re-checked (post-major upgrades), not before.~~

## CI audit gate (blocking)

Since 2026-09-09 the `api`, `storefront` and `dashboard` CI jobs run
`scripts/audit-gate.mjs` right after `npm ci`. The gate runs
`npm audit --omit=dev --json`, resolves every High/Critical finding to
advisory IDs (following `via` chains), and fails only on IDs **not**
listed in that app's `audit-baseline.json`:

```json
{ "accept": { "GHSA-xxxx-xxxx-xxxx": "reason, traceable to this record" } }
```

- Matching is by advisory ID, so an accepted exception can never hide a
  future, different advisory on the same package (verified by negative
  control: empty baseline fails listing all 3 API findings individually).
- Current baselines: api accepts `GHSA-GGR8-5VV4-36MX` (see exception
  above); storefront and dashboard accept nothing.
- The `e2e` job is excluded (dev-only harness, zero findings).
- **When the gate fails:** do not run `npm audit fix`. Identify the new
  advisory, assess exploitability in our threat model, then either apply
  a directed bump (new commit, gates green) or add a justified exception
  to the baseline (new commit, reason required).
