// Pure cost-estimation helpers for Anthropic API usage. The edge function
// stores raw token counts on each find row; this module turns them into USD
// and rolls them up by day/month for reporting. Pricing changes don't require
// data backfills — recompute from stored counts with the new rates.

export interface ApiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface CostBreakdown {
  inputUsd: number;
  outputUsd: number;
  cacheReadUsd: number;
  cacheCreationUsd: number;
  totalUsd: number;
}

// Per-million-token pricing in USD. Cache rates assume the default 5-minute
// TTL: writes are 1.25× base input, reads are 0.1×. For 1-hour TTL writes,
// pass an alternate rate via overrides if we ever opt into that.
interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

const PRICING_BY_MODEL: Record<string, ModelPricing> = {
  'claude-haiku-4-5': { inputPerMillion: 1.0, outputPerMillion: 5.0 },
  'claude-haiku-4-5-20251001': { inputPerMillion: 1.0, outputPerMillion: 5.0 },
  'claude-sonnet-4-6': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'claude-opus-4-7': { inputPerMillion: 5.0, outputPerMillion: 25.0 },
  'claude-opus-4-6': { inputPerMillion: 5.0, outputPerMillion: 25.0 },
};

const CACHE_WRITE_MULTIPLIER = 1.25; // 5-minute TTL ephemeral write
const CACHE_READ_MULTIPLIER = 0.1;

export function estimateCostUsd(model: string, usage: ApiUsage): CostBreakdown {
  const pricing = PRICING_BY_MODEL[model];
  if (!pricing) {
    throw new Error(`Unknown model for cost estimation: ${model}`);
  }
  const inputUsd = (usage.inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputUsd = (usage.outputTokens / 1_000_000) * pricing.outputPerMillion;
  const cacheReadUsd =
    (usage.cacheReadInputTokens / 1_000_000) * pricing.inputPerMillion * CACHE_READ_MULTIPLIER;
  const cacheCreationUsd =
    (usage.cacheCreationInputTokens / 1_000_000) * pricing.inputPerMillion * CACHE_WRITE_MULTIPLIER;
  return {
    inputUsd,
    outputUsd,
    cacheReadUsd,
    cacheCreationUsd,
    totalUsd: inputUsd + outputUsd + cacheReadUsd + cacheCreationUsd,
  };
}

export interface UsageRecord extends ApiUsage {
  model: string;
  createdAt: Date | string;
}

function dayKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function monthKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function emptyBreakdown(): CostBreakdown {
  return { inputUsd: 0, outputUsd: 0, cacheReadUsd: 0, cacheCreationUsd: 0, totalUsd: 0 };
}

function addBreakdown(a: CostBreakdown, b: CostBreakdown): CostBreakdown {
  return {
    inputUsd: a.inputUsd + b.inputUsd,
    outputUsd: a.outputUsd + b.outputUsd,
    cacheReadUsd: a.cacheReadUsd + b.cacheReadUsd,
    cacheCreationUsd: a.cacheCreationUsd + b.cacheCreationUsd,
    totalUsd: a.totalUsd + b.totalUsd,
  };
}

function aggregateBy(
  records: UsageRecord[],
  keyOf: (date: Date | string) => string
): Map<string, CostBreakdown> {
  const out = new Map<string, CostBreakdown>();
  for (const r of records) {
    const cost = estimateCostUsd(r.model, r);
    const k = keyOf(r.createdAt);
    out.set(k, addBreakdown(out.get(k) ?? emptyBreakdown(), cost));
  }
  return out;
}

export function aggregateByDay(records: UsageRecord[]): Map<string, CostBreakdown> {
  return aggregateBy(records, dayKey);
}

export function aggregateByMonth(records: UsageRecord[]): Map<string, CostBreakdown> {
  return aggregateBy(records, monthKey);
}

// Cache hit rate: cached reads as a share of all input that *could* have come
// from cache (reads + writes + uncached input). Useful for monitoring whether
// the prompt prefix is actually stable across requests — see prompt-caching.md
// silent-invalidator audit.
export function cacheHitRate(usage: ApiUsage): number {
  const denominator =
    usage.inputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens;
  return denominator === 0 ? 0 : usage.cacheReadInputTokens / denominator;
}
