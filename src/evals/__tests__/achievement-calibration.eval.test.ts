// Jest-discoverable thin wrapper around the eval suite.
// Skipped by default — calibration runs the generator N times and is very
// expensive. Set RUN_EVALS=1 AND RUN_CALIBRATION=1 to actually execute.
// The double-gate is intentional: RUN_EVALS=1 alone (used by the structural
// achievement suite) must NOT trigger ~20 paid Claude calls.
import { achievementCalibrationCases } from '../achievement-calibration.eval';
import type { EvalContext } from '../types';

const enabled =
  process.env.RUN_EVALS === '1' &&
  process.env.RUN_CALIBRATION === '1' &&
  Boolean(process.env.ANTHROPIC_API_KEY);

const describeFn = enabled ? describe : describe.skip;

// Calibration suite doesn't touch fixtures or the vision endpoint, but the
// EvalContext type requires both. Stub them — the cases never call these.
const ctx: EvalContext = {
  fixtureUrl: () => {
    throw new Error('fixtureUrl not used by achievement-calibration suite');
  },
  validate: () => {
    throw new Error('validate not used by achievement-calibration suite');
  },
};

describeFn('achievement-calibration evals (live)', () => {
  for (const c of achievementCalibrationCases) {
    test(
      c.name,
      async () => {
        const result = await c.run(ctx);
        if (!result.passed) {
          throw new Error(result.reason ?? `${c.name} failed`);
        }
      },
      // Calibration runs the generator up to 50 times sequentially. Give it
      // a generous timeout so a slow Anthropic response doesn't kill the run.
      30 * 60_000
    );
  }
});

test('placeholder so jest does not fail empty suites', () => {
  expect(true).toBe(true);
});
