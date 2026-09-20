# newshub-e2e — Browser E2E (Playwright)

Deterministic, isolated browser tests over dashboard + storefront + API.

## Prerequisites (once)

- PostgreSQL running (same instance as API dev).
- `createdb -h localhost -p 5433 -U postgres newshub_e2e`
- Stop any dev servers on `:3000`, `:3001`, `:3002` (the suite boots its own
  with `reuseExistingServer: false`).
- Set the E2E test environment (passwords/secrets never live in code —
  see `.env.example` for the full list):
  ```powershell
  $env:E2E_EDITOR_PASSWORD="Editor123!"
  $env:E2E_REVIEWER_PASSWORD="Reviewer123!"
  $env:E2E_ADMIN_PASSWORD="Admin123!"
  $env:E2E_JWT_SECRET="e2e-test-secret"
  ```
  Values must match the users created by the E2E seed
  (`apps/api/prisma/seed.ts`, dev-only credentials).
  `E2E_DATABASE_URL` overrides the local default (trust auth).

## Run

```bash
npm test            # headed-off (headless) full suite, workers: 1
```

`globalSetup` migrates + seeds `newshub_e2e` every run. Each test uses unique
slugs per run and deletes what it creates, so tests never depend on each other
(`workers: 1` is for resource safety, not for ordering).

## CI

Retries: 2 (CI only). Browsers installed via `playwright install chromium`.
`E2E_DATABASE_URL` env overrides the local default (trust auth).
