/**
 * Audit filter catalog drift guard (P2-2).
 *
 * Fails when the backend emits audit `action` / `entityType` values that
 * are missing from the dashboard AuditBoard filter catalog (or vice
 * versa). Pure static analysis: no DB, no network, no env, zero
 * dependencies. Run from the repo root (CI runs it from apps/api as
 * `node ../../scripts/audit-filter-guard.mjs`).
 *
 * Backend sources:
 *  - `action:` / `entityType:` literals inside `audit.record(...)` and
 *    `recordHistory(...)` argument spans (span-aware scan, so type
 *    annotations such as `action: 'published' | 'unpublished'` are ignored).
 *  - `TransitionAction` / `PlanningAction` string-literal unions plus the
 *    `BULK_ACTIONS` const array (transition/bulk audits reuse those names).
 * Dashboard sources:
 *  - `ACTIONS` / `ENTITY_TYPES` const arrays in AuditBoard.tsx.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = join(ROOT, 'apps', 'api', 'src', 'modules');
const COMMON = join(ROOT, 'apps', 'api', 'src', 'common');
const BOARD = join(
  ROOT,
  'apps',
  'dashboard',
  'features',
  'audit',
  'components',
  'AuditBoard.tsx',
);

function serviceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) serviceFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith('.service.ts')) out.push(full);
  }
  return out;
}

/**
 * Extract string literals for `key:` inside the argument spans of the
 * given call markers. Quote-aware (', ", ` with escapes); anything
 * outside a matched span is ignored.
 */
function spanLiterals(source, markers, key) {
  const found = new Set();
  for (const marker of markers) {
    let from = 0;
    for (;;) {
      const call = source.indexOf(marker, from);
      if (call === -1) break;
      // The '(' closing the marker itself opens the argument span.
      const i = call + marker.length - 1;
      let depth = 0;
      let quote = null;
      let escaped = false;
      let j = i;
      for (; j < source.length; j += 1) {
        const ch = source[j];
        if (quote !== null) {
          if (escaped) escaped = false;
          else if (ch === '\\') escaped = true;
          else if (ch === quote) quote = null;
          continue;
        }
        if (ch === "'" || ch === '"' || ch === '`') quote = ch;
        else if (ch === '(') depth += 1;
        else if (ch === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      const span = source.slice(i, j);
      const re = new RegExp(`${key}:\\s*'([^']+)'`, 'g');
      let m;
      while ((m = re.exec(span)) !== null) found.add(m[1]);
      from = j;
    }
  }
  return found;
}

function unionLiterals(source, typeName) {
  const found = new Set();
  const decl = new RegExp(`export type ${typeName} = ([^;]+);`, 's').exec(source);
  if (!decl) return found;
  const re = /'([^']+)'/g;
  let m;
  while ((m = re.exec(decl[1])) !== null) found.add(m[1]);
  return found;
}

function constArrayLiterals(source, constName) {
  const found = new Set();
  const decl = new RegExp(`const ${constName} = \\[([\\s\\S]*?)\\];`).exec(source);
  if (decl) {
    const re = /'([^']+)'/g;
    let m;
    while ((m = re.exec(decl[1])) !== null) found.add(m[1]);
  }
  const asConst = new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\] as const`).exec(source);
  if (asConst) {
    const re = /'([^']+)'/g;
    let m;
    while ((m = re.exec(asConst[1])) !== null) found.add(m[1]);
  }
  return found;
}

const backendActions = new Set();
const backendTypes = new Set();
for (const file of serviceFiles(MODULES)) {
  const src = readFileSync(file, 'utf8');
  for (const a of spanLiterals(src, ['audit.record(', 'recordHistory('], 'action')) backendActions.add(a);
  for (const t of spanLiterals(src, ['audit.record(', 'recordHistory('], 'entityType')) backendTypes.add(t);
}
const common = (name) => readFileSync(join(COMMON, name), 'utf8');
for (const a of unionLiterals(common('transitions.ts'), 'TransitionAction')) backendActions.add(a);
for (const a of unionLiterals(common('planning-transitions.ts'), 'PlanningAction')) backendActions.add(a);
const bulk = readFileSync(
  join(MODULES, 'articles', 'dto', 'bulk.dto.ts'),
  'utf8',
);
for (const a of constArrayLiterals(bulk, 'BULK_ACTIONS')) backendActions.add(a);

const board = readFileSync(BOARD, 'utf8');
const dashboardActions = constArrayLiterals(board, 'ACTIONS');
const dashboardTypes = constArrayLiterals(board, 'ENTITY_TYPES');

const missingActions = [...backendActions].filter((a) => !dashboardActions.has(a)).sort();
const extraActions = [...dashboardActions].filter((a) => !backendActions.has(a)).sort();
const missingTypes = [...backendTypes].filter((t) => !dashboardTypes.has(t)).sort();
const extraTypes = [...dashboardTypes].filter((t) => !backendTypes.has(t)).sort();

let failed = false;
const report = (label, values) => {
  if (values.length > 0) {
    failed = true;
    console.error(`${label}: ${values.join(', ')}`);
  }
};
report('backend actions missing from dashboard catalog', missingActions);
report('dashboard actions with no backend emitter', extraActions);
report('backend entity types missing from dashboard catalog', missingTypes);
report('dashboard entity types with no backend emitter', extraTypes);

// Label coverage (P2-2 approval: codes stay identifiers, users see
// translated text). Convention: flat keys `action_<code>` / `type_<code>`
// with dots/dashes sanitized to underscores (dots are invalid in
// next-intl message keys). Every catalog value needs its key in both
// locales; the board falls back to the raw code at runtime.
const labelKey = (prefix, code) => `${prefix}_${code.replace(/[.-]/g, '_')}`;
const MESSAGES = join(ROOT, 'apps', 'dashboard', 'src', 'messages');
const esAudit = JSON.parse(readFileSync(join(MESSAGES, 'es.json'), 'utf8')).audit;
const enAudit = JSON.parse(readFileSync(join(MESSAGES, 'en.json'), 'utf8')).audit;
for (const locale of ['es', 'en']) {
  const audit = locale === 'es' ? esAudit : enAudit;
  for (const a of [...dashboardActions].sort()) {
    if (typeof audit[labelKey('action', a)] !== 'string') {
      failed = true;
      console.error(`missing ${locale} label: audit.${labelKey('action', a)} (action '${a}')`);
    }
  }
  for (const e of [...dashboardTypes].sort()) {
    if (typeof audit[labelKey('type', e)] !== 'string') {
      failed = true;
      console.error(`missing ${locale} label: audit.${labelKey('type', e)} (entity type '${e}')`);
    }
  }
}
// The board must reference exactly the conventional keys (a typo in a
// t('...') literal would silently fall back to the raw code at runtime).
{
  const used = new Set();
  const re = /t\('(action_[a-z_]+|type_[a-z_]+)'\)/g;
  let m;
  while ((m = re.exec(board)) !== null) used.add(m[1]);
  const expected = new Set([
    ...[...dashboardActions].map((a) => labelKey('action', a)),
    ...[...dashboardTypes].map((e) => labelKey('type', e)),
  ]);
  for (const key of [...expected].sort()) {
    if (!used.has(key)) {
      failed = true;
      console.error(`board never renders label key: audit.${key}`);
    }
  }
  for (const key of [...used].sort()) {
    if (!expected.has(key) && (key.startsWith('action_') || key.startsWith('type_'))) {
      failed = true;
      console.error(`board references unexpected label key: audit.${key}`);
    }
  }
}

// Message key syntax: next-intl rejects '.' in keys at runtime (it
// expresses nesting). Build/lint do not catch it, so guard it here.
function dottedKeys(node, path, out) {
  if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key.includes('.')) out.push(path ? `${path}.${key}` : key);
      dottedKeys(value, path ? `${path}.${key}` : key, out);
    }
  }
  return out;
}
for (const locale of ['es', 'en']) {
  const messages = JSON.parse(readFileSync(join(MESSAGES, `${locale}.json`), 'utf8'));
  const bad = dottedKeys(messages, '', []);
  if (bad.length > 0) {
    failed = true;
    console.error(`dotted message keys in ${locale}.json (invalid at next-intl runtime): ${bad.join(', ')}`);
  }
}

if (failed) {
  console.error('audit-filter-guard: DRIFT DETECTED');
  process.exit(1);
}
console.log(
  `audit-filter-guard: OK (${backendActions.size} actions, ${backendTypes.size} entity types in sync)`,
);
