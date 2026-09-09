/**
 * P0-4 backup: pg_dump (custom format) + media tree copy + manifest.
 *
 * Usage:
 *   node scripts/backup.mjs [--database-url=...] [--media-dir=...] [--out=...]
 *
 * Defaults: DATABASE_URL / MEDIA_DIR (or ./storage) / ./backups/<timestamp>.
 * Output: <out>/db.dump, <out>/media/, <out>/manifest.json
 * The manifest pins per-table row counts used later by restore --verify.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TABLES, capture, dbName, describeDb, fail, getArg, pgBin, requireEnv, run, tableCounts } from './lib.mjs';

function countFiles(dir) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    n += entry.isDirectory() ? countFiles(full) : 1;
  }
  return n;
}

try {
  const databaseUrl = getArg(process.argv.slice(2), 'database-url', process.env.DATABASE_URL ?? '');
  if (!databaseUrl) fail('set --database-url or DATABASE_URL');
  const mediaDir = resolve(getArg(process.argv.slice(2), 'media-dir', process.env.MEDIA_DIR ?? 'storage'));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = resolve(getArg(process.argv.slice(2), 'out', `backups/${stamp}`));

  const dumpBin = pgBin('pg_dump');
  const psqlBin = pgBin('psql');
  const dumpVersion = capture(dumpBin, ['--version']);
  console.log(`source: ${describeDb(databaseUrl)}`);
  console.log(`pg_dump: ${dumpVersion}`);

  mkdirSync(out, { recursive: true });
  const dumpFile = resolve(out, 'db.dump');
  run(dumpBin, ['--format=custom', `--file=${dumpFile}`, '--dbname', databaseUrl]);
  console.log(`dump: ${dumpFile}`);

  let mediaFiles = 0;
  if (existsSync(mediaDir)) {
    cpSync(mediaDir, resolve(out, 'media'), { recursive: true });
    mediaFiles = countFiles(resolve(out, 'media'));
  } else {
    console.log(`media dir missing, skipping copy: ${mediaDir}`);
  }
  console.log(`media files: ${mediaFiles}`);

  const counts = tableCounts(databaseUrl, psqlBin);
  const manifest = {
    tool: 'newshub backup.mjs (P0-4)',
    createdAt: new Date().toISOString(),
    dbName: dbName(databaseUrl),
    dumpVersion,
    dumpFile: 'db.dump',
    mediaDir: 'media',
    mediaFiles,
    tables: counts,
  };
  writeFileSync(resolve(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest: ${resolve(out, 'manifest.json')}`);
  console.log(`tables: ${TABLES.map((t) => `${t}=${counts[t]}`).join(' ')}`);
  console.log('BACKUP OK');
} catch (err) {
  fail(err?.message ?? String(err));
}
