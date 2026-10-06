// Latency budget fence: every edge function's worst case (all Anthropic
// attempts time out) must finish before the Supabase request limit, so a
// slow upstream lands in our own error path (vision_failed / agent_failed /
// subagent_failed) instead of a gateway 5xx. Call counts per function are in
// docs/specs/2-anthropic-timeouts-retries.md — update both together.

import {
  ANTHROPIC_MAX_RETRIES,
  ANTHROPIC_TIMEOUT_GENERATION_MS,
  ANTHROPIC_TIMEOUT_TEXT_MS,
  ANTHROPIC_TIMEOUT_VISION_MS,
  AWARD_XP_LOOP_BUDGET_MS,
  EDGE_FUNCTION_LIMIT_MS,
  worstCaseCallMs,
} from '../anthropic-config';

describe('worstCaseCallMs', () => {
  it('adds one timeout per attempt plus SDK backoff', () => {
    expect(worstCaseCallMs(10_000, 0)).toBe(10_000);
    expect(worstCaseCallMs(10_000, 1)).toBe(20_500);
    expect(worstCaseCallMs(10_000, 2)).toBe(31_500);
  });
});

describe('edge function latency budget', () => {
  it('keeps vision longer than short text turns', () => {
    expect(ANTHROPIC_TIMEOUT_VISION_MS).toBeGreaterThan(ANTHROPIC_TIMEOUT_TEXT_MS);
  });

  it('validate-find discover mode (2 sequential vision calls) fits', () => {
    expect(2 * worstCaseCallMs(ANTHROPIC_TIMEOUT_VISION_MS)).toBeLessThan(EDGE_FUNCTION_LIMIT_MS);
  });

  it('award-xp loop budget plus one in-flight step fits', () => {
    expect(AWARD_XP_LOOP_BUDGET_MS + worstCaseCallMs(ANTHROPIC_TIMEOUT_TEXT_MS)).toBeLessThan(
      EDGE_FUNCTION_LIMIT_MS
    );
  });

  it('generate-collection (coordinator, then parallel subagents) fits', () => {
    expect(2 * worstCaseCallMs(ANTHROPIC_TIMEOUT_GENERATION_MS)).toBeLessThan(
      EDGE_FUNCTION_LIMIT_MS
    );
  });

  it('retries at least once on transient errors', () => {
    expect(ANTHROPIC_MAX_RETRIES).toBeGreaterThanOrEqual(1);
  });
});
