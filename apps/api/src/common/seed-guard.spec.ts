import { assertSeedAllowed, describeSeedTarget } from './seed-guard';

describe('seed guard (M9)', () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevFlag = process.env.ALLOW_DESTRUCTIVE_SEED;

  afterEach(() => {
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevFlag === undefined) delete process.env.ALLOW_DESTRUCTIVE_SEED;
    else process.env.ALLOW_DESTRUCTIVE_SEED = prevFlag;
  });

  it('refuses production without the explicit flag', () => {
    expect(() =>
      assertSeedAllowed({ NODE_ENV: 'production' } as NodeJS.ProcessEnv),
    ).toThrow(/ALLOW_DESTRUCTIVE_SEED=true/);
  });

  it.each([['1'], ['yes'], ['TRUE'], ['']])(
    'refuses production with non-exact flag %p',
    (flag) => {
      expect(() =>
        assertSeedAllowed({ NODE_ENV: 'production', ALLOW_DESTRUCTIVE_SEED: flag } as NodeJS.ProcessEnv),
      ).toThrow();
    },
  );

  it('allows production with the exact flag', () => {
    expect(() =>
      assertSeedAllowed({ NODE_ENV: 'production', ALLOW_DESTRUCTIVE_SEED: 'true' } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it.each([[undefined], ['development'], ['test']])('allows NODE_ENV=%p without flag', (env) => {
    expect(() =>
      assertSeedAllowed({ NODE_ENV: env } as unknown as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it('redacts credentials from the target summary', () => {
    expect(describeSeedTarget('postgresql://user:secret@localhost:5433/newshub_e2e')).toBe(
      'postgresql://localhost:5433/newshub_e2e',
    );
    expect(describeSeedTarget(undefined)).toBe('(DATABASE_URL unset)');
    expect(describeSeedTarget('not a url')).toBe('(unparseable DATABASE_URL)');
  });
});
