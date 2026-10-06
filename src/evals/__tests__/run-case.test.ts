// runEvalCase + Warsaw regression case, exercised with a fake EvalContext.
// Always on (not gated by RUN_EVALS): no network, no Claude calls. Pins the
// "pending fixture → skipped, never billed" contract and the regression
// assertion itself, so neither silently weakens while the fixture is missing.

import { warsawChurchNotMermaid } from '../ai-validation.eval';
import { buildReport } from '../report';
import { runEvalCase } from '../run-case';
import type { EvalCase, EvalContext } from '../types';

type ValidateReturn = Awaited<ReturnType<EvalContext['validate']>>;

function fakeCtx(opts: {
  fixtures?: string[];
  verdict?: Partial<ValidateReturn> & { valid?: boolean };
}): { ctx: EvalContext; validate: jest.Mock } {
  const validate = jest.fn(
    async (): Promise<ValidateReturn> => ({
      result: {
        valid: opts.verdict?.valid ?? false,
        confidence: 0.93,
        detected: 'a Gothic red-brick church with two spires',
        suggestion: 'This is a church, not the mermaid statue.',
      },
      durationMs: 1200,
      matchesClaim: opts.verdict?.matchesClaim,
      overridden: opts.verdict?.overridden ?? false,
    })
  );
  const available = new Set(opts.fixtures ?? []);
  const ctx: EvalContext = {
    fixtureUrl: (name) => `https://fixtures.example/${name}`,
    fixtureExists: async (name) => available.has(name),
    validate,
  };
  return { ctx, validate };
}

describe('runEvalCase — pending fixtures', () => {
  it('skips without calling the model when the fixture is missing', async () => {
    const { ctx, validate } = fakeCtx({ fixtures: [] });
    const r = await runEvalCase(warsawChurchNotMermaid, ctx);
    expect(r.skipped).toBe(true);
    expect(r.reason).toContain('warsaw-church.jpg');
    expect(validate).not.toHaveBeenCalled();
  });

  it('treats a context without fixtureExists as missing', async () => {
    const { ctx, validate } = fakeCtx({});
    const r = await runEvalCase(warsawChurchNotMermaid, { ...ctx, fixtureExists: undefined });
    expect(r.skipped).toBe(true);
    expect(validate).not.toHaveBeenCalled();
  });

  it('turns a throwing case into a failed (not skipped) result', async () => {
    const boom: EvalCase = {
      name: 'boom',
      run: async () => {
        throw new Error('network down');
      },
    };
    const r = await runEvalCase(boom, fakeCtx({}).ctx);
    expect(r).toMatchObject({ passed: false, reason: 'network down' });
    expect(r.skipped).toBeUndefined();
  });
});

describe('regression_warsaw_church_not_mermaid', () => {
  const fixtures = ['warsaw-church.jpg'];

  it('passes when the model rejects the claim on its own', async () => {
    const { ctx } = fakeCtx({ fixtures, verdict: { valid: false, matchesClaim: false } });
    const r = await runEvalCase(warsawChurchNotMermaid, ctx);
    expect(r.passed).toBe(true);
  });

  it('fails on the original false positive (valid=true)', async () => {
    const { ctx } = fakeCtx({ fixtures, verdict: { valid: true, matchesClaim: true } });
    const r = await runEvalCase(warsawChurchNotMermaid, ctx);
    expect(r.passed).toBe(false);
    expect(r.reason).toContain('valid=true');
  });

  it('fails when matches_claim is missing, even if valid=false', async () => {
    const { ctx } = fakeCtx({ fixtures, verdict: { valid: false, matchesClaim: undefined } });
    const r = await runEvalCase(warsawChurchNotMermaid, ctx);
    expect(r.passed).toBe(false);
  });
});

describe('buildReport with skipped cases', () => {
  it('excludes skipped cases from accuracy and counts them separately', () => {
    const report = buildReport('ai-validation', new Date().toISOString(), [
      { name: 'a', passed: true, parsed: true, durationMs: 100 },
      { name: 'b', passed: false, parsed: true, durationMs: 300 },
      { name: 'pending', passed: false, skipped: true, parsed: false, durationMs: 0 },
    ]);
    expect(report).toMatchObject({ total: 2, passed: 1, failed: 1, skipped: 1, accuracy: 0.5 });
    expect(report.cases).toHaveLength(3);
  });
});
