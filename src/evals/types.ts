import type { ValidationResult } from '@schemas';

export interface EvalCaseResult {
  name: string;
  passed: boolean;
  durationMs: number;
  parsed: boolean;
  // Case didn't run (e.g. a required fixture isn't uploaded yet). Excluded
  // from accuracy in buildReport. See runEvalCase.
  skipped?: boolean;
  reason?: string;
  result?: ValidationResult;
  meta?: Record<string, unknown>;
}

export interface EvalReport {
  suite: string;
  startedAt: string;
  finishedAt: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  accuracy: number;
  formatComplianceRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  cases: EvalCaseResult[];
}

export interface EvalContext {
  fixtureUrl: (name: string) => string;
  // Optional: lets runEvalCase skip cases whose fixtures aren't uploaded.
  // Suites without fixtures don't need it.
  fixtureExists?: (name: string) => Promise<boolean>;
  validate: (
    photoUrl: string,
    collectionDescription: string,
    itemName: string
  ) => Promise<{
    result: ValidationResult;
    durationMs: number;
    // Raw tool fields that ValidationResult strips. Optional so stubs in
    // non-vision suites stay valid.
    matchesClaim?: boolean;
    // True when the matches_claim/valid safety net overrode `valid`.
    overridden?: boolean;
  }>;
}

export interface EvalCase {
  name: string;
  // Fixtures this case needs. While any is missing from the bucket the case
  // is PENDING: runEvalCase reports it as skipped without calling Claude.
  requiredFixtures?: string[];
  run: (ctx: EvalContext) => Promise<EvalCaseResult>;
}
