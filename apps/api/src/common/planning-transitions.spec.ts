import { isOverdue, resolvePlanningTransition } from './planning-transitions';

describe('resolvePlanningTransition (Inc 8 locked matrix)', () => {
  it.each([
    ['pitched', 'assign', 'assigned'],
    ['assigned', 'start', 'in-progress'],
    ['in-progress', 'submit', 'in-review'],
    ['in-review', 'complete', 'done'],
    ['pitched', 'cancel', 'cancelled'],
    ['assigned', 'cancel', 'cancelled'],
    ['in-progress', 'cancel', 'cancelled'],
    ['in-review', 'cancel', 'cancelled'],
    ['done', 'reopen', 'pitched'],
    ['cancelled', 'reopen', 'pitched'],
  ] as const)('%s + %s -> %s', (from, action, to) => {
    expect(resolvePlanningTransition(from, action)).toBe(to);
  });

  it.each([
    ['assigned', 'assign'],
    ['in-progress', 'start'],
    ['in-review', 'submit'],
    ['done', 'complete'],
    ['cancelled', 'cancel'],
    ['pitched', 'reopen'],
  ] as const)('%s + %s -> no-op (null)', (from, action) => {
    expect(resolvePlanningTransition(from, action)).toBeNull();
  });

  it.each([
    ['pitched', 'start'],
    ['pitched', 'submit'],
    ['pitched', 'complete'],
    ['assigned', 'submit'],
    ['assigned', 'complete'],
    ['in-progress', 'complete'],
    ['in-progress', 'assign'],
    ['done', 'cancel'],
    ['done', 'assign'],
    ['cancelled', 'complete'],
  ] as const)('%s + %s -> 409 invalid_transition', (from, action) => {
    expect(() => resolvePlanningTransition(from, action)).toThrow(
      expect.objectContaining({ status: 409 }),
    );
    try {
      resolvePlanningTransition(from, action);
    } catch (err) {
      expect((err as { response: { code: string } }).response.code).toBe('invalid_transition');
    }
  });
});

describe('isOverdue', () => {
  it('flags past-due open items only', () => {
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 3600_000);
    expect(isOverdue('assigned', past)).toBe(true);
    expect(isOverdue('assigned', future)).toBe(false);
    expect(isOverdue('assigned', null)).toBe(false);
    expect(isOverdue('done', past)).toBe(false);
    expect(isOverdue('cancelled', past)).toBe(false);
  });
});
