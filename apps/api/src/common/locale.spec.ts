import { DEFAULT_LOCALE, resolveLocale } from './locale';

describe('resolveLocale (?locale > Accept-Language > es)', () => {
  it('prefers explicit ?locale over the header', () => {
    expect(resolveLocale('en', 'es')).toEqual({ requested: 'en', resolved: 'en', fallback: false });
    expect(resolveLocale('es', 'en')).toEqual({ requested: 'es', resolved: 'es', fallback: false });
  });

  it('uses Accept-Language when no explicit locale', () => {
    expect(resolveLocale(undefined, 'en-US,en;q=0.9')).toEqual({
      requested: 'en',
      resolved: 'en',
      fallback: false,
    });
    expect(resolveLocale(undefined, 'es')).toEqual({ requested: 'es', resolved: 'es', fallback: false });
  });

  it('defaults to es without signals', () => {
    expect(resolveLocale(undefined, undefined)).toEqual({
      requested: 'es',
      resolved: 'es',
      fallback: false,
    });
    expect(DEFAULT_LOCALE).toBe('es');
  });
});
