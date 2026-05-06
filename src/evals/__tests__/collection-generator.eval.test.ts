// Jest-discoverable thin wrapper around the eval suite.
// Skipped by default — eval runs hit a paid API and execute the full
// multi-agent pipeline (~6 Claude calls / ~$0.08). Set RUN_EVALS=1 to
// actually execute, otherwise jest just sees an empty placeholder test.
import { collectionGeneratorCases } from '../collection-generator.eval';
import type { EvalContext } from '../types';

const enabled = process.env.RUN_EVALS === '1' && Boolean(process.env.ANTHROPIC_API_KEY);

const describeFn = enabled ? describe : describe.skip;

// Collection suites don't touch fixtures or the vision endpoint, but the
// EvalContext type requires both. Stub them — the cases never call these.
const ctx: EvalContext = {
  fixtureUrl: () => {
    throw new Error('fixtureUrl not used by collection-generator suite');
  },
  validate: () => {
    throw new Error('validate not used by collection-generator suite');
  },
};

describeFn('collection-generator evals (live)', () => {
  for (const c of collectionGeneratorCases) {
    test(
      c.name,
      async () => {
        const result = await c.run(ctx);
        if (!result.passed) {
          throw new Error(result.reason ?? `${c.name} failed`);
        }
      },
      // The generator runs topic + coordinator + 4 subagents in parallel —
      // 60s wall-clock is plenty when latency is normal but tight if
      // Anthropic is slow. 120s gives headroom without masking real hangs.
      120_000
    );
  }
});

test('placeholder so jest does not fail empty suites', () => {
  expect(true).toBe(true);
});
