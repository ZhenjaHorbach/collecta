// Jest-discoverable thin wrapper around the eval suite.
// Skipped by default — eval runs hit a paid API and are slow. Set RUN_EVALS=1
// to actually execute, otherwise jest just sees an empty placeholder test.
import { achievementGeneratorCases } from '../achievement-generator.eval';
import type { EvalContext } from '../types';

const enabled = process.env.RUN_EVALS === '1' && Boolean(process.env.ANTHROPIC_API_KEY);

const describeFn = enabled ? describe : describe.skip;

// Achievement suites don't touch fixtures or the vision endpoint, but the
// EvalContext type requires both. Stub them — the cases never call these.
const ctx: EvalContext = {
  fixtureUrl: () => {
    throw new Error('fixtureUrl not used by achievement-generator suite');
  },
  validate: () => {
    throw new Error('validate not used by achievement-generator suite');
  },
};

describeFn('achievement-generator evals (live)', () => {
  for (const c of achievementGeneratorCases) {
    test(
      c.name,
      async () => {
        const result = await c.run(ctx);
        if (!result.passed) {
          throw new Error(result.reason ?? `${c.name} failed`);
        }
      },
      60_000
    );
  }
});

test('placeholder so jest does not fail empty suites', () => {
  expect(true).toBe(true);
});
