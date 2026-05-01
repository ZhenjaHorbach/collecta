import type { ValidationResult } from '@schemas';

export interface EvalCaseResult {
  name: string;
  passed: boolean;
  durationMs: number;
  parsed: boolean;
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
  accuracy: number;
  formatComplianceRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  cases: EvalCaseResult[];
}

export interface EvalContext {
  fixtureUrl: (name: string) => string;
  validate: (
    photoUrl: string,
    collectionDescription: string,
    itemName: string
  ) => Promise<{ result: ValidationResult; durationMs: number }>;
}

export interface EvalCase {
  name: string;
  run: (ctx: EvalContext) => Promise<EvalCaseResult>;
}
