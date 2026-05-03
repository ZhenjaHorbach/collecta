import { ValidationResultSchema } from '@schemas';

import type { EvalCase, EvalCaseResult, EvalContext } from './types';

const COLLECTION_CATS = 'Photos of domestic cats in everyday surroundings.';
const COLLECTION_ARCH = 'Photos of brutalist architecture.';

async function safeRun(
  ctx: EvalContext,
  args: { photo: string; collection: string; item: string }
): Promise<{
  raw: unknown;
  parsed: boolean;
  result?: ReturnType<typeof ValidationResultSchema.parse>;
  durationMs: number;
  reason?: string;
}> {
  try {
    const { result, durationMs } = await ctx.validate(args.photo, args.collection, args.item);
    return { raw: result, parsed: true, result, durationMs };
  } catch (err) {
    return {
      raw: null,
      parsed: false,
      durationMs: 0,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

const formatCompliance: EvalCase = {
  name: 'format_compliance',
  async run(ctx): Promise<EvalCaseResult> {
    const r = await safeRun(ctx, {
      photo: ctx.fixtureUrl('cat.jpg'),
      collection: COLLECTION_CATS,
      item: 'Cat',
    });
    return {
      name: this.name,
      passed: r.parsed,
      durationMs: r.durationMs,
      parsed: r.parsed,
      result: r.result,
      reason: r.reason,
    };
  },
};

const truePositive: EvalCase = {
  name: 'true_positive_cat',
  async run(ctx): Promise<EvalCaseResult> {
    const r = await safeRun(ctx, {
      photo: ctx.fixtureUrl('cat.jpg'),
      collection: COLLECTION_CATS,
      item: 'Cat',
    });
    const passed = r.parsed && r.result?.valid === true;
    return {
      name: this.name,
      passed,
      durationMs: r.durationMs,
      parsed: r.parsed,
      result: r.result,
      reason: passed ? undefined : 'expected valid=true for cat in cats collection',
    };
  },
};

const trueNegative: EvalCase = {
  name: 'true_negative_dog_in_cats',
  async run(ctx): Promise<EvalCaseResult> {
    const r = await safeRun(ctx, {
      photo: ctx.fixtureUrl('dog.jpg'),
      collection: COLLECTION_CATS,
      item: 'Cat',
    });
    const passed = r.parsed && r.result?.valid === false;
    return {
      name: this.name,
      passed,
      durationMs: r.durationMs,
      parsed: r.parsed,
      result: r.result,
      reason: passed ? undefined : 'expected valid=false for dog in cats collection',
    };
  },
};

const calibration: EvalCase = {
  name: 'confidence_calibration_blurry',
  async run(ctx): Promise<EvalCaseResult> {
    const r = await safeRun(ctx, {
      photo: ctx.fixtureUrl('blurry.jpg'),
      collection: COLLECTION_CATS,
      item: 'Cat',
    });
    const passed = r.parsed && r.result !== undefined && r.result.confidence < 0.5;
    return {
      name: this.name,
      passed,
      durationMs: r.durationMs,
      parsed: r.parsed,
      result: r.result,
      reason: passed
        ? undefined
        : `expected confidence<0.5 for blurry photo, got ${r.result?.confidence}`,
    };
  },
};

const crossCollection: EvalCase = {
  name: 'cross_collection_building',
  async run(ctx): Promise<EvalCaseResult> {
    const arch = await safeRun(ctx, {
      photo: ctx.fixtureUrl('building.jpg'),
      collection: COLLECTION_ARCH,
      item: 'Brutalist building',
    });
    const cats = await safeRun(ctx, {
      photo: ctx.fixtureUrl('building.jpg'),
      collection: COLLECTION_CATS,
      item: 'Cat',
    });
    const passed =
      arch.parsed && cats.parsed && arch.result?.valid === true && cats.result?.valid === false;
    return {
      name: this.name,
      passed,
      durationMs: arch.durationMs + cats.durationMs,
      parsed: arch.parsed && cats.parsed,
      meta: { arch: arch.result, cats: cats.result },
      reason: passed ? undefined : 'expected building valid for arch but invalid for cats',
    };
  },
};

const stability: EvalCase = {
  name: 'stability_5x_cat',
  async run(ctx): Promise<EvalCaseResult> {
    // Sequential to avoid rate-limit; we're testing determinism, not throughput.
    const runs: Awaited<ReturnType<typeof safeRun>>[] = [];
    for (let i = 0; i < 5; i += 1) {
      runs.push(
        await safeRun(ctx, {
          photo: ctx.fixtureUrl('cat.jpg'),
          collection: COLLECTION_CATS,
          item: 'Cat',
        })
      );
    }
    const allParsed = runs.every((r) => r.parsed);
    const valids = runs.map((r) => r.result?.valid);
    const allSame = valids.every((v) => v === valids[0]);
    const passed = allParsed && allSame;
    return {
      name: this.name,
      passed,
      durationMs: runs.reduce((acc, r) => acc + r.durationMs, 0),
      parsed: allParsed,
      meta: { valids },
      reason: passed
        ? undefined
        : `expected all 5 to parse and agree on valid; parsed=${allParsed} valids=${JSON.stringify(valids)}`,
    };
  },
};

// Verify mode (PR1) covers the existing single-item path. The eval client
// hits Anthropic directly, so this case asserts the prompt still copes when
// the claimed item is more specific than the collection description — the
// shape of verdict the new server-side `mode='verify'` echoes back to the
// client must remain a clean valid/invalid call, not a hedge.
//
// TODO(pr3-eval): the match-in-collection / discover modes (PR3) live only
// in the edge function — match_item / pick_collection tools, plus dynamic
// per-user catalog payloads. Adding cases for them here would either
// duplicate that logic in the eval client (drift risk) or require running
// the eval against a live `validate-find` deploy with a service-role token.
// Defer until we either spin up an HTTP-mode in run.ts or accept a small
// always-on fixture project for evals.
const verifySpecificItem: EvalCase = {
  name: 'verify_specific_item_tabby',
  async run(ctx): Promise<EvalCaseResult> {
    const r = await safeRun(ctx, {
      photo: ctx.fixtureUrl('cat.jpg'),
      collection: COLLECTION_CATS,
      item: 'Tabby Cat',
    });
    const passed = r.parsed && typeof r.result?.valid === 'boolean';
    return {
      name: this.name,
      passed,
      durationMs: r.durationMs,
      parsed: r.parsed,
      result: r.result,
      reason: passed
        ? undefined
        : 'expected verify mode to return a parseable verdict for a specific item claim',
    };
  },
};

const edgeCase: EvalCase = {
  name: 'edge_case_sky',
  async run(ctx): Promise<EvalCaseResult> {
    const r = await safeRun(ctx, {
      photo: ctx.fixtureUrl('sky.jpg'),
      collection: COLLECTION_CATS,
      item: 'Cat',
    });
    const passed =
      r.parsed &&
      r.result?.valid === false &&
      typeof r.result?.suggestion === 'string' &&
      r.result.suggestion.trim().length > 0;
    return {
      name: this.name,
      passed,
      durationMs: r.durationMs,
      parsed: r.parsed,
      result: r.result,
      reason: passed ? undefined : 'expected valid=false with non-empty suggestion for sky photo',
    };
  },
};

const latency: EvalCase = {
  name: 'latency_p95_under_5s',
  async run(ctx): Promise<EvalCaseResult> {
    const N = 10;
    // Run sequentially — parallel calls trigger rate-limit / TCP contention
    // and report misleading per-request latency. We're measuring single-call
    // p95, not throughput.
    const runs: Awaited<ReturnType<typeof safeRun>>[] = [];
    for (let i = 0; i < N; i += 1) {
      runs.push(
        await safeRun(ctx, {
          photo: ctx.fixtureUrl('cat.jpg'),
          collection: COLLECTION_CATS,
          item: 'Cat',
        })
      );
    }
    const durations = runs.map((r) => r.durationMs).sort((a, b) => a - b);
    const p95 = durations[Math.min(durations.length - 1, Math.floor(0.95 * durations.length))];
    const totalDuration = runs.reduce((acc, r) => acc + r.durationMs, 0);
    const allParsed = runs.every((r) => r.parsed);
    const passed = allParsed && p95 < 5000;
    return {
      name: this.name,
      passed,
      durationMs: totalDuration,
      parsed: allParsed,
      meta: { p95Ms: p95, durationsMs: durations },
      reason: passed ? undefined : `expected p95<5000ms, got ${p95}ms`,
    };
  },
};

export const aiValidationCases: EvalCase[] = [
  formatCompliance,
  truePositive,
  trueNegative,
  calibration,
  crossCollection,
  stability,
  edgeCase,
  verifySpecificItem,
  latency,
];
