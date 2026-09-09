# Backup & Restore Runbook (P0-4)

Manual disaster-recovery procedure for the NewsHub PostgreSQL database
plus the API media tree. No scheduling, offsite storage, PITR, or
CI-driven backups — those are explicitly out of scope.

## Prerrequisitos

- Node.js 22+ (scripts use stdlib only).
- PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`, v15+), either on
  `PATH` or via `PG_BIN_DIR` (e.g. `PG_BIN_DIR=C:\Users\dell\pgsql\bin`).
- `DATABASE_URL` pointing at the source database (password via URL or
  `PGPASSWORD`). The operator running the drill needs `CREATEDB` on the
  cluster (to create/drop the scratch database).
- Local note (Windows): if backends spawned from a `pg_ctl`-detached
  postmaster die with `0xC0000142`, run `postgres.exe -D <data> -p 5433`
  in the foreground instead (observed in this dev setup; single-user mode
  can confirm engine/data health independently).

## RPO / RTO

- **RPO:** time since the last manual backup. Recommended cadence for this
  stage: one manual backup before every release/migration, daily otherwise.
- **RTO:** dominated by `pg_restore` + media copy. Measured ~5s for the
  current data volume (42 articles + media tree) in the drill below.
- **Last drill:** 2026-09-09 against `newshub_e2e` — `DRILL OK in 5.3s`,
  source untouched, 12/12 tables verified, media copy path verified
  (live `storage/` holds only empty key dirs, so the copy was additionally
  exercised with fixture files: 2/2 preserved with structure).

## Backup

```bash
cd apps/api
DATABASE_URL="postgresql://postgres@localhost:5433/newshub_e2e" \
  npm run backup -- --out=./backups/manual-2026-09-09
```

Produces `<out>/db.dump` (`pg_dump -Fc`), `<out>/media/` (copy of
`MEDIA_DIR`, default `./storage`) and `<out>/manifest.json` with per-table
row counts. `./backups/` is gitignored — move the dir to safe storage.

## Restore (verification only — never onto the source)

```bash
cd apps/api
node scripts/restore.mjs \
  --backup=./backups/manual-2026-09-09 \
  --target="postgresql://postgres@localhost:5433/newshub_restore_check"
```

The script refuses when the target name equals the manifest source or when
the target already exists, restores into a fresh scratch database, compares
all 12 domain tables against the manifest, then drops the scratch database
(unless `--keep`). Exit non-zero on any mismatch.

## Drill completo (reproducible, seguro)

```bash
cd apps/api
DATABASE_URL="postgresql://postgres@localhost:5433/newshub_e2e" \
  PG_BIN_DIR="C:\Users\dell\pgsql\bin" \
  npm run backup:drill
```

Runs backup → restore → verify → drop scratch DB → remove temp workdir,
printing `DRILL OK in <s>s (source untouched)`. Use `--keep` to preserve
the workdir and scratch DB for inspection.

## Verificación

Success = `DRILL OK` plus a `counts:` line showing all 12 tables with
`actual (want expected)` equal. Any mismatch aborts non-zero and the
scratch database is still dropped.
