import type { EvalCaseResult, EvalReport } from './types';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export function buildReport(suite: string, startedAt: string, cases: EvalCaseResult[]): EvalReport {
  const total = cases.length;
  const passed = cases.filter((c) => c.passed).length;
  const failed = total - passed;
  const parsed = cases.filter((c) => c.parsed).length;
  const latencies = [...cases.map((c) => c.durationMs)].sort((a, b) => a - b);
  const avgLatencyMs =
    latencies.length === 0 ? 0 : latencies.reduce((acc, v) => acc + v, 0) / latencies.length;

  return {
    suite,
    startedAt,
    finishedAt: new Date().toISOString(),
    total,
    passed,
    failed,
    accuracy: total === 0 ? 0 : passed / total,
    formatComplianceRate: total === 0 ? 0 : parsed / total,
    avgLatencyMs,
    p95LatencyMs: percentile(latencies, 95),
    cases,
  };
}
