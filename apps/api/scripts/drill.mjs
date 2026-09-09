/**
 * P0-4 restore drill: backup -> restore into a scratch DB -> verify -> clean up.
 * Never touches the source database. Safe to run against newshub_e2e.
 *
 * Usage:
 *   node scripts/drill.mjs [--database-url=...] [--media-dir=...] [--keep]
 *
 * --keep preserves the backup dir and the scratch database for inspection.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { dbName, describeDb, fail, getArg, hasFlag } from './lib.mjs';

try {
  const args = process.argv.slice(2);
  const databaseUrl = getArg(args, 'database-url', process.env.DATABASE_URL ?? '');
  if (!databaseUrl) fail('set --database-url or DATABASE_URL');
  const mediaDir = getArg(args, 'media-dir', process.env.MEDIA_DIR ?? '');
  const keep = hasFlag(args, 'keep');
  const stamp = Date.now().toString(36);
  const workdir = mkdtempSync(join(tmpdir(), 'nh-drill-'));
  const sourceName = dbName(databaseUrl);
  const targetName = `${sourceName}_drill_${stamp}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 60);
  const base = new URL(databaseUrl);
  base.pathname = `/${targetName}`;
  const targetUrl = base.toString();

  console.log(`drill source: ${describeDb(databaseUrl)}`);
  console.log(`drill target: ${describeDb(targetUrl)}`);
  const started = Date.now();
  const node = process.execPath;
  const run = (script, extra) =>
    execFileSync(node, [resolve('scripts', script), ...extra], { stdio: 'inherit' });

  run('backup.mjs', [
    `--database-url=${databaseUrl}`,
    ...(mediaDir ? [`--media-dir=${mediaDir}`] : []),
    `--out=${join(workdir, 'backup')}`,
  ]);
  run('restore.mjs', [`--backup=${join(workdir, 'backup')}`, `--target=${targetUrl}`]);

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  if (keep) {
    console.log(`kept drill workdir for inspection: ${workdir}`);
  } else {
    rmSync(workdir, { recursive: true, force: true });
  }
  console.log(`DRILL OK in ${secs}s (source untouched)`);
} catch (err) {
  fail(err?.message ?? String(err));
}
