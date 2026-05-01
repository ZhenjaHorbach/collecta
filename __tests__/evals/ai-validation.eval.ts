// Jest-discoverable thin wrapper around the eval suite.
// Skipped by default — eval runs hit a paid API and are slow. Set RUN_EVALS=1
// to actually execute, otherwise jest just sees an empty placeholder test.
import { aiValidationCases } from '../../src/evals/ai-validation.eval';
import { callValidate } from '../../src/evals/client';

const enabled = process.env.RUN_EVALS === '1' && Boolean(process.env.ANTHROPIC_API_KEY);

const describeFn = enabled ? describe : describe.skip;

describeFn('ai-validation evals (live)', () => {
  const base = process.env.FEW_SHOT_FIXTURES_BASE_URL?.replace(/\/$/, '');
  const ctx = {
    fixtureUrl: (name: string) => `${base}/${name}`,
    validate: async (photoUrl: string, collection: string, item: string) => {
      const { result, durationMs } = await callValidate(photoUrl, collection, item);
      return { result, durationMs };
    },
  };

  for (const c of aiValidationCases) {
    test(
      c.name,
      async () => {
        const result = await c.run(ctx);
        if (!result.passed) {
          throw new Error(result.reason ?? `${c.name} failed`);
        }
      },
      30_000
    );
  }
});

test('placeholder so jest does not fail empty suites', () => {
  expect(true).toBe(true);
});
