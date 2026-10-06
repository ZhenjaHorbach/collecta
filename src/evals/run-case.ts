// Shared case executor for both eval run paths (CLI runner in run.ts and the
// Jest wrappers), so "pending fixture" and "case threw" are handled the same
// way everywhere.

import type { EvalCase, EvalCaseResult, EvalContext } from './types';

// Free availability check for a fixture: HEAD request against the public
// Storage URL. Any failure (no base URL configured, network error, 4xx) counts
// as missing — the case is then skipped, never run against a broken URL.
export async function fixtureExistsViaHead(
  fixtureUrl: (name: string) => string,
  name: string
): Promise<boolean> {
  try {
    const res = await fetch(fixtureUrl(name), { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runEvalCase(c: EvalCase, ctx: EvalContext): Promise<EvalCaseResult> {
  if (c.requiredFixtures?.length) {
    const exists = ctx.fixtureExists ?? (async (): Promise<boolean> => false);
    const missing: string[] = [];
    for (const name of c.requiredFixtures) {
      if (!(await exists(name))) missing.push(name);
    }
    if (missing.length > 0) {
      return {
        name: c.name,
        passed: false,
        skipped: true,
        durationMs: 0,
        parsed: false,
        reason: `pending: fixture ${missing.join(', ')} not available`,
      };
    }
  }

  try {
    return await c.run(ctx);
  } catch (err) {
    return {
      name: c.name,
      passed: false,
      durationMs: 0,
      parsed: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
