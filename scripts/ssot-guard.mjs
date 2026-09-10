/**
 * SSOT architecture guard (F0 instrumentation, report-only by default).
 *
 * Detects Storefront/Dashboard regressions against the editorial
 * Single Source of Truth decision (ADR-012):
 *
 *   PostgreSQL -> Prisma -> NestJS API -> Storefront / Dashboard
 *
 * Checks:
 *
 *   1. editorial-imports — production code importing runtime editorial
 *      data from apps/storefront/src/data/* (allowlist below).
 *   2. messages-data — editorial keys data.articles.* / data.categories.*
 *      inside apps/storefront/messages/*.json (baseline debt, warn only).
 *   3. prisma-boundary — @prisma/client / PrismaClient / DATABASE_URL /
 *      direct SQL / pg usage inside apps/storefront or apps/dashboard.
 *      Always an error (zero hits expected).
 *   4. media-legacy — new editorial references to /images/news|opiniones
 *      outside the src/data quarantine (brand assets allowlisted).
 *
 * Allowlist (temporary quarantine, documented in ADR-012):
 *
 *   - `import type ... newsModels` (type-only, erased at build)
 *   - `legalContent` (no API resource by design, FEATURE-001)
 *   - `articleFactory` (pure type helper, dies with its consumers)
 *
 * Exit codes:
 *
 *   0 — no HARD violations (baseline debt listed as warnings)
 *   1 — HARD violation (prisma boundary, or --strict with any violation)
 *   2 — infrastructure error (repo root not found, unreadable files)
 *
 * Usage (from apps/<name>): node ../../scripts/ssot-guard.mjs
 * Usage (from repo root):    node scripts/ssot-guard.mjs
 * Strict mode (F6 gate):     node scripts/ssot-guard.mjs --strict
 *
 * Stdlib only. No services, no PostgreSQL, no source modifications.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const STRICT = process.argv.includes('--strict');

function findRoot() {
  const candidates = [process.cwd(), resolve(process.cwd(), '..', '..')];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'apps', 'storefront', 'package.json'))) return dir;
  }
  console.error('error: repository root not found (expected apps/storefront/package.json).');
  process.exit(2);
}

const ROOT = findRoot();
const SF = join(ROOT, 'apps', 'storefront');
const DASH = join(ROOT, 'apps', 'dashboard');

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '.turbo', 'coverage']);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function read(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

// --- Check 1: editorial runtime imports from src/data -----------------------

const DATA_IMPORT =
  /from\s+['"](@\/data(?:\/[^'"]*)?|\.{1,2}\/(?:\.\.\/)*data(?:\/[^'"]*)?)['"]/g;

function isAllowlisted(spec, lines, idx) {
  // Type-only imports are erased at build and create no runtime dependency.
  // The `from` clause may sit on the closing line of a multiline statement,
  // so resolve the statement start first.
  let start = idx;
  for (let i = idx; i >= 0; i--) {
    if (/^\s*import\b/.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (/^\s*import\s+type\b/.test(lines[start])) return 'type-only';
  if (/legalContent/.test(spec)) return 'legal:legalContent';
  if (/articleFactory/.test(spec)) return 'helper:articleFactory';
  return null;
}

function checkEditorialImports() {
  const hits = [];
  const files = [...walk(join(SF, 'app')), ...walk(join(SF, 'src'))];
  for (const file of files) {
    const content = read(file);
    if (content === null) continue;
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      // Strip trailing comments so commented imports are not flagged.
      const code = line.split('//')[0];
      let m;
      DATA_IMPORT.lastIndex = 0;
      while ((m = DATA_IMPORT.exec(code)) !== null) {
        const allow = isAllowlisted(m[1], lines, i);
        if (allow) continue;
        hits.push({ file: relative(ROOT, file), line: i + 1, spec: m[1], text: code.trim().slice(0, 120) });
      }
    });
  }
  return hits;
}

// --- Check 2: messages/data.* ------------------------------------------------

function checkMessagesData() {
  const report = [];
  for (const locale of ['es', 'en']) {
    const file = join(SF, 'messages', `${locale}.json`);
    if (!existsSync(file)) {
      report.push({ locale, missing: true });
      continue;
    }
    let json;
    try {
      json = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      console.error(`error: unreadable ${relative(ROOT, file)}: ${err?.message ?? err}`);
      process.exit(2);
    }
    const articles = json?.data?.articles ? Object.keys(json.data.articles).length : 0;
    const categories = json?.data?.categories ? Object.keys(json.data.categories).length : 0;
    report.push({ locale, file: relative(ROOT, file), articles, categories });
  }
  return report;
}

// --- Check 3: Prisma / DATABASE_URL boundary ----------------------------------

const DB_PATTERN = /@prisma\/client|PrismaClient|DATABASE_URL|\$queryRaw|\$executeRaw|from\s+['"]pg['"]|require\(\s*['"]pg['"]\s*\)/;

function checkDbBoundary() {
  const hits = [];
  for (const base of [SF, DASH]) {
    for (const file of walk(base)) {
      const content = read(file);
      if (content === null) continue;
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (DB_PATTERN.test(line)) {
          hits.push({ file: relative(ROOT, file), line: i + 1, text: line.trim().slice(0, 120) });
        }
      });
    }
  }
  return hits;
}

// --- Check 4: legacy editorial image paths outside quarantine ------------------

const LEGACY_IMG = /\/images\/(news|opiniones)\//;
const BRAND_OK = /\/images\/logo\/|\/favicon/i;

function checkLegacyMedia() {
  const hits = [];
  const files = [...walk(join(SF, 'app')), ...walk(join(SF, 'src'))];
  for (const file of files) {
    const rel = relative(ROOT, file);
    // src/data/* is the documented quarantine; messages are generated output.
    if (rel.includes(join('src', 'data') + sep) || rel.includes('src/data/')) continue;
    const content = read(file);
    if (content === null) continue;
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (LEGACY_IMG.test(line) && !BRAND_OK.test(line)) {
        hits.push({ file: rel, line: i + 1, text: line.trim().slice(0, 120) });
      }
    });
  }
  return hits;
}

// --- Main ---------------------------------------------------------------------

function main() {
  const editorial = checkEditorialImports();
  const messages = checkMessagesData();
  const boundary = checkDbBoundary();
  const media = checkLegacyMedia();

  const editorialDebt = editorial.length;
  const messagesDebt = messages.reduce((n, m) => n + (m.articles ?? 0) + (m.categories ?? 0), 0);

  console.log('SSOT guard report (ADR-012):');
  console.log(`- editorial src/data imports: ${editorialDebt} (baseline debt, warn)`);
  for (const h of editorial.slice(0, 25)) {
    console.log(`    warn ${h.file}:${h.line} from '${h.spec}' :: ${h.text}`);
  }
  if (editorial.length > 25) console.log(`    ... and ${editorial.length - 25} more`);
  for (const m of messages) {
    if (m.missing) console.log(`- messages/${m.locale}.json: MISSING FILE`);
    else console.log(`- ${m.file}: data.articles=${m.articles} data.categories=${m.categories} (baseline debt, warn)`);
  }
  console.log(`- prisma/DATABASE_URL boundary hits: ${boundary.length}`);
  for (const h of boundary) {
    console.log(`    ERROR ${h.file}:${h.line} :: ${h.text}`);
  }
  console.log(`- legacy editorial image refs outside quarantine: ${media.length}`);
  for (const h of media.slice(0, 25)) {
    console.log(`    warn ${h.file}:${h.line} :: ${h.text}`);
  }
  if (media.length > 25) console.log(`    ... and ${media.length - 25} more`);

  if (boundary.length > 0) {
    console.error(`ssot guard FAILED: ${boundary.length} DATABASE boundary violation(s).`);
    process.exit(1);
  }
  if (STRICT && (editorialDebt > 0 || messagesDebt > 0 || media.length > 0)) {
    console.error(
      `ssot guard FAILED (--strict): ${editorialDebt} editorial import(s), ` +
        `${messagesDebt} messages data key(s), ${media.length} legacy media ref(s).`,
    );
    process.exit(1);
  }
  console.log(
    `ssot guard OK: boundary clean${STRICT ? ' (strict)' : ''} ` +
      `(${editorialDebt} editorial import(s), ${messagesDebt} messages data key(s), ` +
      `${media.length} legacy media ref(s) tracked as baseline debt).`,
  );
}

main();
