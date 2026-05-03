import {
  aggregateByDay,
  aggregateByMonth,
  cacheHitRate,
  estimateCostUsd,
  type UsageRecord,
} from '../cost-tracker';

describe('estimateCostUsd', () => {
  it('computes Haiku 4.5 cost for plain (uncached) usage', () => {
    const cost = estimateCostUsd('claude-haiku-4-5', {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    });
    expect(cost.inputUsd).toBeCloseTo(1.0, 6);
    expect(cost.outputUsd).toBeCloseTo(5.0, 6);
    expect(cost.cacheReadUsd).toBe(0);
    expect(cost.cacheCreationUsd).toBe(0);
    expect(cost.totalUsd).toBeCloseTo(6.0, 6);
  });

  it('applies the 1.25× write and 0.1× read multipliers to cache tokens', () => {
    const cost = estimateCostUsd('claude-haiku-4-5', {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 1_000_000,
      cacheCreationInputTokens: 1_000_000,
    });
    expect(cost.cacheReadUsd).toBeCloseTo(0.1, 6);
    expect(cost.cacheCreationUsd).toBeCloseTo(1.25, 6);
    expect(cost.totalUsd).toBeCloseTo(1.35, 6);
  });

  it('accepts the dated alias and returns identical pricing', () => {
    const usage = {
      inputTokens: 5000,
      outputTokens: 200,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    };
    expect(estimateCostUsd('claude-haiku-4-5-20251001', usage)).toEqual(
      estimateCostUsd('claude-haiku-4-5', usage)
    );
  });

  it('throws on unknown model', () => {
    expect(() =>
      estimateCostUsd('claude-unknown-99', {
        inputTokens: 1,
        outputTokens: 1,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      })
    ).toThrow(/Unknown model/);
  });
});

describe('cacheHitRate', () => {
  it('returns 0 when nothing was processed', () => {
    expect(
      cacheHitRate({
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      })
    ).toBe(0);
  });

  it('reports the share of input tokens served from cache', () => {
    expect(
      cacheHitRate({
        inputTokens: 100,
        outputTokens: 999,
        cacheReadInputTokens: 700,
        cacheCreationInputTokens: 200,
      })
    ).toBeCloseTo(700 / 1000, 6);
  });
});

describe('aggregation', () => {
  const records: UsageRecord[] = [
    {
      model: 'claude-haiku-4-5',
      createdAt: '2026-05-03T10:00:00Z',
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    },
    {
      model: 'claude-haiku-4-5',
      createdAt: '2026-05-03T22:30:00Z',
      inputTokens: 2_000_000,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    },
    {
      model: 'claude-haiku-4-5',
      createdAt: '2026-06-01T00:00:00Z',
      inputTokens: 500_000,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    },
  ];

  it('rolls up by ISO day', () => {
    const byDay = aggregateByDay(records);
    expect(byDay.get('2026-05-03')?.totalUsd).toBeCloseTo(3.0, 6);
    expect(byDay.get('2026-06-01')?.totalUsd).toBeCloseTo(0.5, 6);
  });

  it('rolls up by ISO month', () => {
    const byMonth = aggregateByMonth(records);
    expect(byMonth.get('2026-05')?.totalUsd).toBeCloseTo(3.0, 6);
    expect(byMonth.get('2026-06')?.totalUsd).toBeCloseTo(0.5, 6);
  });
});
