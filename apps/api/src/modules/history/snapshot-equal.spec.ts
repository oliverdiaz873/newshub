import { snapshotsEqual } from './snapshot-equal';
import type { RevisionSnapshot } from './revisions.service';

function snap(overrides?: Partial<RevisionSnapshot>): RevisionSnapshot {
  return {
    translations: [
      { locale: 'es', slug: 'a', title: 'A', summary: 'S', coverAlt: null, content: ['P.'] },
    ],
    status: 'draft',
    categoryId: 'c1',
    authorId: null,
    coverMediaId: null,
    isBreaking: false,
    isFeatured: false,
    publishedAt: null,
    scheduledAt: null,
    ...overrides,
  };
}

describe('snapshotsEqual (D1 no-op rule)', () => {
  it('treats identical snapshots as equal', () => {
    expect(snapshotsEqual(snap(), snap())).toBe(true);
  });

  it('ignores translation order', () => {
    const a = snap({
      translations: [
        { locale: 'en', slug: 'a', title: 'A', summary: 'S', coverAlt: null, content: ['P.'] },
        { locale: 'es', slug: 'a', title: 'A', summary: 'S', coverAlt: null, content: ['P.'] },
      ],
    });
    const b = snap({ translations: [...a.translations].reverse() });
    expect(snapshotsEqual(a, b)).toBe(true);
  });

  it('detects content, status, relation and flag changes', () => {
    const base = snap();
    expect(snapshotsEqual(base, snap({ status: 'review' }))).toBe(false);
    expect(
      snapshotsEqual(base, snap({ translations: [{ ...base.translations[0], title: 'B' }] })),
    ).toBe(false);
    expect(snapshotsEqual(base, snap({ coverMediaId: 'm1' }))).toBe(false);
    expect(snapshotsEqual(base, snap({ isFeatured: true }))).toBe(false);
    expect(snapshotsEqual(base, snap({ publishedAt: new Date(0).toISOString() }))).toBe(false);
  });
});
