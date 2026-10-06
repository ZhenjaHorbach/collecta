// Jest-discoverable thin wrapper around the eval suite.
// Skipped by default — eval runs hit a paid API and are slow. Set RUN_EVALS=1
// to actually execute, otherwise jest just sees an empty placeholder test.
import { aiValidationCases } from '../ai-validation.eval';
import { callValidate } from '../client';
import { fixtureExistsViaHead, runEvalCase } from '../run-case';

const enabled = process.env.RUN_EVALS === '1' && Boolean(process.env.ANTHROPIC_API_KEY);

const describeFn = enabled ? describe : describe.skip;

describeFn('ai-validation evals (live)', () => {
  const base = process.env.FEW_SHOT_FIXTURES_BASE_URL?.replace(/\/$/, '');
  const fixtureUrl = (name: string): string => `${base}/${name}`;
  const ctx = {
    fixtureUrl,
    fixtureExists: (name: string) => fixtureExistsViaHead(fixtureUrl, name),
    validate: async (photoUrl: string, collection: string, item: string) => {
      const { result, durationMs, matchesClaim, overridden } = await callValidate(
        photoUrl,
        collection,
        item
      );
      return { result, durationMs, matchesClaim, overridden };
    },
  };

  for (const c of aiValidationCases) {
    test(
      c.name,
      async () => {
        const result = await runEvalCase(c, ctx);
        // Pending case (fixture not uploaded yet) — nothing ran, nothing to
        // assert. The CLI report lists it under `skipped`.
        if (result.skipped) return;
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
