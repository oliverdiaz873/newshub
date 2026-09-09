# newshub-e2e — Browser E2E (Playwright)

Deterministic, isolated browser tests over dashboard + storefront + API.

## Prerequisites (once)

- PostgreSQL running (same instance as API dev).
- `createdb -h localhost -p 5433 -U postgres newshub_e2e`
- Stop any dev servers on `:3000`, `:3001`, `:3002` (the suite boots its own
  with `reuseExistingServer: false`).

## Run

```bash
npm test            # headed-off (headless) full suite, workers: 1
```

`globalSetup` migrates + seeds `newshub_e2e` every run. Each test uses fixed
slugs and deletes what it creates, so tests never depend on each other
(`workers: 1` is for resource safety, not for ordering).

## CI

Retries: 2 (CI only). Browsers installed via `playwright install chromium`.
`E2E_DATABASE_URL` env overrides the local default (trust auth).
