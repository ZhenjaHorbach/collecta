// Structural evals for the weekly achievement generator. Run on every PR
// that touches the prompt or the script (paths-filtered in
// .github/workflows/evals-achievement.yml). One Claude call per CI run.
// Goal: catch prompt regressions where the model returns the wrong shape,
// uses a forbidden condition kind, picks a duplicate code/icon, or proposes
// a threshold that doesn't advance the catalog.
//
// Calibration (dup rate across many runs, mean cost, self-grading) lives in
// achievement-calibration.eval.ts and is only run on workflow_dispatch.

import {
  fetchExistingCatalog,
  generateAchievement,
  validateAgainstCatalog,
  type ProposedAchievement,
} from '../../scripts/generate-achievement';

import type { EvalCase, EvalCaseResult } from './types';

const CONDITION_KINDS = ['finds_count', 'streak_days', 'reactions_given', 'collections_complete'];

interface RunOnce {
  proposal: ProposedAchievement | null;
  reason?: string;
  durationMs: number;
}

// Cached across cases in the same run so the suite costs ONE Claude call,
// not one per assertion. Lives at module scope; the harness creates a fresh
// process per CI run, so no cross-run leakage.
let memoised: Promise<RunOnce> | null = null;
function runGeneratorOnce(): Promise<RunOnce> {
  if (memoised) return memoised;
  memoised = (async () => {
    const startedAt = Date.now();
    try {
      const r = await generateAchievement();
      return { proposal: r.achievement, durationMs: Date.now() - startedAt };
    } catch (err) {
      return {
        proposal: null,
        reason: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startedAt,
      };
    }
  })();
  return memoised;
}

function caseFromAssertion(
  name: string,
  assertion: (p: ProposedAchievement) => string | null
): EvalCase {
  return {
    name,
    async run(): Promise<EvalCaseResult> {
      const r = await runGeneratorOnce();
      if (!r.proposal) {
        return { name, passed: false, parsed: false, durationMs: r.durationMs, reason: r.reason };
      }
      const failure = assertion(r.proposal);
      return {
        name,
        passed: failure === null,
        parsed: true,
        durationMs: r.durationMs,
        reason: failure ?? undefined,
        meta: { proposal: r.proposal },
      };
    },
  };
}

const formatCompliance = caseFromAssertion('format_compliance', () => null);

const conditionKindAllowlist = caseFromAssertion('condition_kind_allowlist', (p) =>
  CONDITION_KINDS.includes(p.condition.kind)
    ? null
    : `condition.kind="${p.condition.kind}" not in allowlist`
);

const gtePositive = caseFromAssertion('gte_positive_integer', (p) =>
  Number.isInteger(p.condition.gte) && p.condition.gte >= 1
    ? null
    : `gte must be positive integer, got ${p.condition.gte}`
);

const xpRewardBounds = caseFromAssertion('xp_reward_in_bounds', (p) =>
  p.xp_reward >= 20 && p.xp_reward <= 200 ? null : `xp_reward=${p.xp_reward} outside 20–200`
);

const codeShape = caseFromAssertion('code_snake_case', (p) =>
  /^[a-z][a-z0-9_]{2,39}$/.test(p.code) ? null : `code "${p.code}" not snake_case 3–40`
);

const titleLength = caseFromAssertion('title_length', (p) =>
  p.title.length >= 2 && p.title.length <= 32 ? null : `title length=${p.title.length} outside 2–32`
);

const descriptionLength = caseFromAssertion('description_length', (p) =>
  p.description.length >= 12 && p.description.length <= 120
    ? null
    : `description length=${p.description.length} outside 12–120`
);

const iconNonEmpty = caseFromAssertion('icon_present', (p) =>
  p.icon.trim().length >= 1 ? null : 'icon empty'
);

// Catalog cross-check: dedup vs live data. Reuses the same validator the
// production script runs, so this case fails for the exact reasons the
// script would refuse to write a migration.
const noCatalogCollision: EvalCase = {
  name: 'no_catalog_collision',
  async run(): Promise<EvalCaseResult> {
    const r = await runGeneratorOnce();
    if (!r.proposal) {
      return {
        name: this.name,
        passed: false,
        parsed: false,
        durationMs: r.durationMs,
        reason: r.reason,
      };
    }
    try {
      const existing = await fetchExistingCatalog();
      validateAgainstCatalog(r.proposal, existing);
      return { name: this.name, passed: true, parsed: true, durationMs: r.durationMs };
    } catch (err) {
      return {
        name: this.name,
        passed: false,
        parsed: true,
        durationMs: r.durationMs,
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

export const achievementGeneratorCases: EvalCase[] = [
  formatCompliance,
  conditionKindAllowlist,
  gtePositive,
  xpRewardBounds,
  codeShape,
  titleLength,
  descriptionLength,
  iconNonEmpty,
  noCatalogCollision,
];
