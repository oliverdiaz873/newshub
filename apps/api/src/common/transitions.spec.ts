import { resolveTransition } from './transitions';

describe('resolveTransition (F4 locked matrix)', () => {
  it.each([
    ['draft', 'publish', 'published'],
    ['review', 'publish', 'published'],
    ['published', 'unpublish', 'draft'],
    ['published', 'archive', 'archived'],
    ['draft', 'archive', 'archived'],
    ['archived', 'restore', 'draft'],
  ] as const)('%s + %s -> %s', (from, action, to) => {
    expect(resolveTransition(from, action)).toBe(to);
  });

  it.each([
    ['published', 'publish'],
    ['draft', 'unpublish'],
    ['archived', 'archive'],
  ] as const)('%s + %s -> no-op (null)', (from, action) => {
    expect(resolveTransition(from, action)).toBeNull();
  });

  it.each([
    ['archived', 'publish'],
    ['draft', 'restore'],
    ['published', 'restore'],
    ['review', 'restore'],
    ['review', 'unpublish'],
    ['review', 'archive'],
    ['archived', 'unpublish'],
  ] as const)('%s + %s -> 409 invalid_transition', (from, action) => {
    expect(() => resolveTransition(from, action)).toThrow(
      expect.objectContaining({ status: 409 }),
    );
    try {
      resolveTransition(from, action);
    } catch (err) {
      expect((err as { response: { code: string } }).response.code).toBe('invalid_transition');
    }
  });
});
