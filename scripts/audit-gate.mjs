/**
 * CI audit gate: fails only on NEW High/Critical findings.
 *
 * Runs `npm audit --omit=dev --json` in the current workspace and compares
 * every high/critical finding (per affected package, advisory IDs resolved
 * through `via` chains) against <cwd>/audit-baseline.json:
 *
 *   { "accept": { "<GHSA-id>": "reason…" } }
 *
 * Exit 0 when every finding is accepted; exit 1 listing each unaccepted
 * package finding (severity, advisory id/title/url). Matching by advisory
 * ID (not by package) guarantees an accepted exception can never hide a
 * future, different advisory on the same package.
 *
 * Usage (from apps/<name>): node ../../scripts/audit-gate.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SEVERITIES = new Set(['high', 'critical']);

function loadBaseline() {
  const path = resolve('audit-baseline.json');
  if (!existsSync(path)) return {};
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return raw.accept ?? {};
}

function advisoryId(entry) {
  if (typeof entry !== 'object' || entry === null) return null;
  const url = typeof entry.url === 'string' ? entry.url : '';
  const match = /GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/i.exec(url);
  if (match) return match[0].toUpperCase();
  if (typeof entry.title === 'string' && entry.title) {
    return `${entry.name ?? 'advisory'}: ${entry.title}`;
  }
  return null;
}

/** Advisory IDs for one finding node, following string `via` references. */
function nodeIds(node, all, seen = new Set()) {
  const ids = new Map();
  const visit = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    const n = all[key];
    if (!n || typeof n !== 'object') return;
    for (const ref of n.via ?? []) {
      if (typeof ref === 'string') visit(ref);
      else {
        const id = advisoryId(ref);
        if (id) ids.set(id, ref);
      }
    }
  };
  visit(node);
  return ids;
}

function main() {
  const accept = loadBaseline();
  // Windows does not resolve bare `npm` for child processes, and .cmd
  // shims require a shell.
  const shell = process.platform === 'win32';
  const npm = shell ? 'npm.cmd' : 'npm';
  let report;
  try {
    const out = execFileSync(npm, ['audit', '--omit=dev', '--json'], {
      shell,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    report = JSON.parse(out);
  } catch (err) {
    // npm exits non-zero when findings exist; stdout still carries JSON.
    const out = err?.stdout;
    if (typeof out !== 'string' || !out.trim()) {
      console.error(`error: npm audit failed without JSON output: ${err?.message ?? err}`);
      process.exit(2);
    }
    report = JSON.parse(out);
  }

  const all = report.vulnerabilities ?? {};
  const unaccepted = [];
  let accepted = 0;
  for (const [key, node] of Object.entries(all)) {
    if (!node || typeof node !== 'object' || !SEVERITIES.has(node.severity)) continue;
    const ids = nodeIds(key, all);
    const name = node.name ?? key;
    if (ids.size === 0) {
      unaccepted.push({ package: name, severity: node.severity, id: '(unidentified)', title: '', url: '' });
      continue;
    }
    let hidden = 0;
    for (const [id, ref] of ids) {
      if (accept[id]) hidden += 1;
      else {
        unaccepted.push({
          package: name,
          severity: node.severity,
          id,
          title: ref.title ?? '',
          url: ref.url ?? '',
        });
      }
    }
    accepted += hidden;
  }

  if (unaccepted.length > 0) {
    console.error(`audit gate FAILED: ${unaccepted.length} unaccepted high/critical finding(s):`);
    for (const f of unaccepted) {
      console.error(`- [${f.severity}] ${f.package}: ${f.id} ${f.title} ${f.url}`.trim());
    }
    process.exit(1);
  }
  console.log(
    `audit gate OK: no unaccepted high/critical findings (${accepted} accepted exception reference(s)).`,
  );
}

main();
