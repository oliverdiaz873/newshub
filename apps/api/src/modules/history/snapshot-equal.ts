import type { RevisionSnapshot } from './revisions.service';

/**
 * Effective-content equality for revision snapshots (D1 no-op rule).
 *
 * Both snapshots are built by the same builder (`snapshotArticle` /
 * `snapshotOpinion`), so top-level key order is stable; translations are
 * sorted by locale because the DB returns them in unspecified order.
 * Comparison is on the canonical string: conceptually
 * `snapshotBefore === snapshotAfter`.
 */
function canonical(snapshot: RevisionSnapshot): string {
  const translations = [...snapshot.translations].sort((a, b) =>
    a.locale < b.locale ? -1 : a.locale > b.locale ? 1 : 0,
  );
  return JSON.stringify({ ...snapshot, translations });
}

export function snapshotsEqual(a: RevisionSnapshot, b: RevisionSnapshot): boolean {
  return canonical(a) === canonical(b);
}
