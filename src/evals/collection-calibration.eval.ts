// Calibration suite for the collection generator. Heavy — runs the full
// pipeline (topic + coordinator + 4 subagents = ~6 Claude calls) N times
// and rolls up dup-rate, category variety, mean cost, item-count
// distribution, and a self-graded usefulness score.
//
// Tunable via env:
//   COLLECTION_CALIBRATION_RUNS  default 8 (max 20 to bound cost)

import Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

import { generateCollection, type GenerateResult } from '../../scripts/generate-collection';
import { estimateCostUsd, type ApiUsage } from '../utils/cost-tracker';

import type { EvalCase, EvalCaseResult } from './types';

const SELF_GRADE_MODEL = 'claude-haiku-4-5-20251001';

interface SingleRun {
  result: GenerateResult;
}

function toApiUsage(raw: GenerateResult['usage']): ApiUsage {
  return {
    inputTokens: raw.input_tokens,
    outputTokens: raw.output_tokens,
    cacheReadInputTokens: raw.cache_read_input_tokens,
    cacheCreationInputTokens: raw.cache_creation_input_tokens,
  };
}

async function selfGradeBatch(runs: SingleRun[]): Promise<{ scores: number[]; usage: ApiUsage }> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY required');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tool: Tool = {
    name: 'grade_collections',
    description:
      'Score each proposed starter collection 1–5 on whether a casual user would enjoy hunting for it.',
    input_schema: {
      type: 'object',
      properties: {
        scores: {
          type: 'array',
          items: { type: 'integer', minimum: 1, maximum: 5 },
        },
      },
      required: ['scores'],
    },
  };
  const message = await anthropic.messages.create({
    model: SELF_GRADE_MODEL,
    max_tokens: 1024,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [
      {
        role: 'user',
        content: `Rate each of these proposed Collecta starter collections 1–5 on whether a casual user could realistically photograph most of the items during normal life and would feel rewarded doing so. 1 = boring/inaccessible/duplicates, 5 = clearly fun and photographable. Return scores in the same order.\n\n${runs
          .map((r, i) => {
            const c = r.result.collection;
            const sample = c.items
              .slice(0, 5)
              .map((it) => `${it.name} [${it.rarity}]`)
              .join('; ');
            return `${i + 1}. ${c.title} (${c.category}) — ${c.description}\n   sample items: ${sample}`;
          })
          .join('\n\n')}`,
      },
    ],
  });
  const block = message.content.find((b) => b.type === 'tool_use');
  const scores = ((block as { input?: { scores?: number[] } } | undefined)?.input?.scores ??
    []) as number[];
  const u = message.usage;
  return {
    scores,
    usage: {
      inputTokens: u.input_tokens ?? 0,
      outputTokens: u.output_tokens ?? 0,
      cacheReadInputTokens: u.cache_read_input_tokens ?? 0,
      cacheCreationInputTokens: u.cache_creation_input_tokens ?? 0,
    },
  };
}

const calibration: EvalCase = {
  name: 'calibration_batch',
  async run(): Promise<EvalCaseResult> {
    const requested = Number(process.env.COLLECTION_CALIBRATION_RUNS ?? '8');
    const N = Math.max(1, Math.min(20, requested));
    const startedAt = Date.now();

    const runs: SingleRun[] = [];
    const errors: string[] = [];
    for (let i = 0; i < N; i += 1) {
      try {
        const result = await generateCollection();
        runs.push({ result });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    // Title-level dedup. Soft normalisation matches what
    // validateTopicAgainstCatalog does in production.
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
    const titleKeys = runs.map((r) => norm(r.result.collection.title));
    const uniqueTitles = new Set(titleKeys);
    const dupRate = titleKeys.length === 0 ? 0 : 1 - uniqueTitles.size / titleKeys.length;

    const categoryCounts: Record<string, number> = {};
    for (const r of runs) {
      const k = r.result.collection.category;
      categoryCounts[k] = (categoryCounts[k] ?? 0) + 1;
    }

    const itemCounts = runs.map((r) => r.result.collection.items.length);
    const meanItems =
      itemCounts.length === 0 ? 0 : itemCounts.reduce((a, b) => a + b, 0) / itemCounts.length;

    // Aggregate rarity distribution across all generated items, not within a
    // single collection. Calibrates whether the rarity subagent is biased
    // (e.g. always 80% common).
    const rarityCounts: Record<string, number> = { common: 0, uncommon: 0, rare: 0 };
    let totalItems = 0;
    for (const r of runs) {
      for (const item of r.result.collection.items) {
        rarityCounts[item.rarity] = (rarityCounts[item.rarity] ?? 0) + 1;
        totalItems += 1;
      }
    }

    const generationCostUsd = runs.reduce(
      (sum, r) => sum + estimateCostUsd(r.result.model, toApiUsage(r.result.usage)).totalUsd,
      0
    );

    let selfGradeAvg: number | null = null;
    let selfGradeCostUsd = 0;
    if (runs.length > 0) {
      try {
        const grade = await selfGradeBatch(runs);
        if (grade.scores.length > 0) {
          selfGradeAvg = grade.scores.reduce((a, b) => a + b, 0) / grade.scores.length;
        }
        selfGradeCostUsd = estimateCostUsd(SELF_GRADE_MODEL, grade.usage).totalUsd;
      } catch (err) {
        errors.push(`self-grade failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const durationMs = Date.now() - startedAt;
    return {
      name: this.name,
      // Calibration is report-only: pass as long as at least one run
      // succeeded. Quality regression is a human-review concern.
      passed: runs.length > 0,
      parsed: runs.length > 0,
      durationMs,
      reason: errors.length > 0 ? errors.join(' | ') : undefined,
      meta: {
        requestedRuns: N,
        completedRuns: runs.length,
        failedRuns: errors.length,
        uniqueTitles: uniqueTitles.size,
        dupRate,
        categoryDistribution: categoryCounts,
        meanItemCount: meanItems,
        totalItemsGenerated: totalItems,
        rarityDistribution: rarityCounts,
        rarityShareCommon: totalItems === 0 ? 0 : (rarityCounts.common ?? 0) / totalItems,
        rarityShareUncommon: totalItems === 0 ? 0 : (rarityCounts.uncommon ?? 0) / totalItems,
        rarityShareRare: totalItems === 0 ? 0 : (rarityCounts.rare ?? 0) / totalItems,
        meanGenerationCostUsd: runs.length > 0 ? generationCostUsd / runs.length : 0,
        totalGenerationCostUsd: generationCostUsd,
        selfGradeAvg,
        selfGradeCostUsd,
        sampleProposals: runs.slice(0, 3).map((r) => ({
          title: r.result.collection.title,
          category: r.result.collection.category,
          itemCount: r.result.collection.items.length,
          topic: r.result.topic.topic,
        })),
      },
    };
  },
};

export const collectionCalibrationCases: EvalCase[] = [calibration];
