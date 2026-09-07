import { coverUrl, publicApiUrl } from './cover-url';

describe('coverUrl', () => {
  it('keeps legacy storefront-relative paths untouched', () => {
    expect(coverUrl({ id: 'x', storageKey: '/images/news/politica/congreso.avif' })).toBe(
      '/images/news/politica/congreso.avif',
    );
  });

  it('resolves uploaded keys to the public media route, never the key', () => {
    const url = coverUrl({ id: 'abc', storageKey: 'ab/abc.jpg' });
    expect(url).toBe(`${publicApiUrl()}/api/v1/media/abc/content`);
    expect(url).not.toContain('ab/abc.jpg');
  });

  it('returns empty string without cover', () => {
    expect(coverUrl(null)).toBe('');
  });
});
