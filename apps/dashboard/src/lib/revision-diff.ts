/**
 * Client-side revision diff (Increment 6). Compares two snapshots field by
 * field; the snapshot stays the restore source of truth, the diff is only
 * a display aid (no server compare endpoint by design).
 */

export interface SnapshotTranslation {
  locale: string;
  slug: string;
  title: string;
  summary: string;
  coverAlt: string | null;
  content: unknown;
}

export interface RevisionSnapshotShape {
  translations: SnapshotTranslation[];
  status: string;
  categoryId?: string | null;
  authorId?: string | null;
  coverMediaId?: string | null;
  isBreaking?: boolean;
  isFeatured?: boolean;
  publishedAt?: string | null;
  scheduledAt?: string | null;
}

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

const PREVIEW = 160;

function preview(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const text = Array.isArray(value)
    ? value.map((p) => String(p)).join('\n\n')
    : String(value);
  return text.length > PREVIEW ? text.slice(0, PREVIEW) + '…' : text;
}

function scalarDiff(field: string, before: unknown, after: unknown, out: FieldChange[]) {
  const a = preview(before);
  const b = preview(after);
  if (a !== b) out.push({ field, before: a, after: b });
}

/** Older → newer snapshot diff. Empty array means no visible change. */
export function diffSnapshots(older: RevisionSnapshotShape, newer: RevisionSnapshotShape): FieldChange[] {
  const out: FieldChange[] = [];
  const locales = [...new Set([...older.translations.map((t) => t.locale), ...newer.translations.map((t) => t.locale)])];
  for (const locale of locales) {
    const a = older.translations.find((t) => t.locale === locale);
    const b = newer.translations.find((t) => t.locale === locale);
    if (!a && b) {
      out.push({ field: `${locale}.translation`, before: '—', after: preview(b.title) });
      continue;
    }
    if (a && !b) {
      out.push({ field: `${locale}.translation`, before: preview(a.title), after: '—' });
      continue;
    }
    if (!a || !b) continue;
    scalarDiff(`${locale}.slug`, a.slug, b.slug, out);
    scalarDiff(`${locale}.title`, a.title, b.title, out);
    scalarDiff(`${locale}.summary`, a.summary, b.summary, out);
    scalarDiff(`${locale}.coverAlt`, a.coverAlt, b.coverAlt, out);
    scalarDiff(`${locale}.content`, a.content, b.content, out);
  }
  scalarDiff('status', older.status, newer.status, out);
  scalarDiff('categoryId', older.categoryId, newer.categoryId, out);
  scalarDiff('authorId', older.authorId, newer.authorId, out);
  scalarDiff('coverMediaId', older.coverMediaId, newer.coverMediaId, out);
  scalarDiff('isBreaking', older.isBreaking, newer.isBreaking, out);
  scalarDiff('isFeatured', older.isFeatured, newer.isFeatured, out);
  scalarDiff('publishedAt', older.publishedAt, newer.publishedAt, out);
  scalarDiff('scheduledAt', older.scheduledAt, newer.scheduledAt, out);
  return out;
}
