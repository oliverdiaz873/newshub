/**
 * P0-4 restore: pg_restore into a scratch database + count verification.
 *
 * Safety: the target must be a FRESH database name that differs from the
 * manifest source. This script never writes to the source database and
 * refuses an existing target (no --clean, no drops of pre-existing data
 * except the scratch DB it created itself).
 *
 * Usage:
 *   node scripts/restore.mjs --backup=<dir> --target=<database-url> [--keep]
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  TABLES,
  capture,
  databaseExists,
  dbName,
  describeDb,
  fail,
  getArg,
  hasFlag,
  pgBin,
  run,
  tableCounts,
} from './lib.mjs';

try {
  const args = process.argv.slice(2);
  const backupDir = resolve(getArg(args, 'backup', ''));
  const targetUrl = getArg(args, 'target', '');
  const keep = hasFlag(args, 'keep');
  if (!backupDir || !targetUrl) fail('usage: node scripts/restore.mjs --backup=<dir> --target=<database-url> [--keep]');

  const manifestPath = resolve(backupDir, 'manifest.json');
  const dumpPath = resolve(backupDir, 'db.dump');
  if (!existsSync(manifestPath) || !existsSync(dumpPath)) {
    fail(`backup dir must contain manifest.json and db.dump: ${backupDir}`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const targetName = dbName(targetUrl);
  if (targetName === manifest.dbName) {
    fail(`refusing: target "${targetName}" equals the backup source database`);
  }

  const psqlBin = pgBin('psql');
  const restoreBin = pgBin('pg_restore');
  if (databaseExists(targetUrl, psqlBin)) {
    fail(`refusing: target database already exists: ${describeDb(targetUrl)}`);
  }

  console.log(`backup: ${backupDir} (source was "${manifest.dbName}")`);
  console.log(`target: ${describeDb(targetUrl)}`);
  const base = new URL(targetUrl);
  base.pathname = '/postgres';
  run(psqlBin, ['--dbname', base.toString(), '--command', `CREATE DATABASE "${targetName.replace(/"/g, '')}"`]);
  console.log('scratch database created');

  let restored = true;
  try {
    run(restoreBin, ['--dbname', targetUrl, dumpPath]);
    const actual = tableCounts(targetUrl, psqlBin);
    const mismatches = TABLES.filter((t) => actual[t] !== manifest.tables?.[t]);
    console.log(`counts: ${TABLES.map((t) => `${t}=${actual[t]} (want ${manifest.tables?.[t]})`).join(' ')}`);
    if (mismatches.length > 0) fail(`count mismatch on: ${mismatches.join(', ')}`);
    console.log('VERIFY OK');
  } catch (err) {
    restored = false;
    throw err;
  } finally {
    if (!keep) {
      run(psqlBin, ['--dbname', base.toString(), '--command', `DROP DATABASE IF EXISTS "${targetName.replace(/"/g, '')}"`]);
      console.log('scratch database dropped');
    } else {
      console.log(`kept scratch database for inspection: ${describeDb(targetUrl)}`);
    }
  }
  if (restored) console.log('RESTORE OK');
} catch (err) {
  if (err?.message && !String(err.message).startsWith('error:')) fail(err.message);
  process.exit(1);
}
