// Calibration suite for the achievement generator. Heavy — runs the
// generator N times and rolls up dup-rate, kind variety, mean cost, and a
// self-graded usefulness score. Only run on workflow_dispatch. At ~$0.001
// per achievement on Haiku 4.5, default N=20 ≈ $0.02 per run plus the
// self-grade turn — cheap enough to run regularly. Output is a report-only
// artefact, never fails CI on quality drift — the PR review is the gate
// for "is this fun?"
//
// Tunable via env:
//   ACHIEVEMENT_CALIBRATION_RUNS  default 20 (max 50 to bound cost)

import Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

import { generateAchievement, type ProposedAchievement } from '../../scripts/generate-achievement';
import { estimateCostUsd, type ApiUsage } from '../utils/cost-tracker';

import type { EvalCase, EvalCaseResult } from './types';

const SELF_GRADE_MODEL = 'claude-haiku-4-5-20251001';

interface SingleRun {
  proposal: ProposedAchievement;
  usage: ApiUsage;
  model: string;
}

function toApiUsage(raw: {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}): ApiUsage {
  return {
    inputTokens: raw.input_tokens,
    outputTokens: raw.output_tokens,
    cacheReadInputTokens: raw.cache_read_input_tokens,
    cacheCreationInputTokens: raw.cache_creation_input_tokens,
  };
}

async function selfGradeBatch(proposals: ProposedAchievement[]): Promise<{
  scores: number[];
  usage: ApiUsage;
}> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY required');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tool: Tool = {
    name: 'grade_proposals',
    description: 'Score each proposal 1-5 on whether it would feel rewarding to unlock.',
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
    max_tokens: 512,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [
      {
        role: 'user',
        content: `Rate each of these proposed Collecta achievements 1–5 on whether it feels like a satisfying milestone for a casual user. 1 = filler/forgettable, 5 = genuinely motivating. Return scores in the same order.\n\n${proposals
          .map(
            (p, i) =>
              `${i + 1}. ${p.title} (${p.icon}) — ${p.description} [${p.condition.kind} ≥ ${p.condition.gte}, +${p.xp_reward} XP]`
          )
          .join('\n')}`,
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
    const requested = Number(process.env.ACHIEVEMENT_CALIBRATION_RUNS ?? '20');
    const N = Math.max(1, Math.min(50, requested));
    const startedAt = Date.now();

    const runs: SingleRun[] = [];
    const errors: string[] = [];
    for (let i = 0; i < N; i += 1) {
      try {
        const r = await generateAchievement();
        runs.push({ proposal: r.achievement, usage: toApiUsage(r.usage), model: r.model });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    const codes = runs.map((r) => r.proposal.code);
    const uniqueCodes = new Set(codes);
    const dupRate = codes.length === 0 ? 0 : 1 - uniqueCodes.size / codes.length;

    const kindCounts: Record<string, number> = {};
    for (const r of runs) {
      kindCounts[r.proposal.condition.kind] = (kindCounts[r.proposal.condition.kind] ?? 0) + 1;
    }

    const generationCostUsd = runs.reduce(
      (sum, r) => sum + estimateCostUsd(r.model, r.usage).totalUsd,
      0
    );

    let selfGradeAvg: number | null = null;
    let selfGradeCostUsd = 0;
    if (runs.length > 0) {
      try {
        const grade = await selfGradeBatch(runs.map((r) => r.proposal));
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
      // Calibration is report-only: we always pass as long as at least one
      // run succeeded. Quality regression is a human-review concern.
      passed: runs.length > 0,
      parsed: runs.length > 0,
      durationMs,
      reason: errors.length > 0 ? errors.join(' | ') : undefined,
      meta: {
        requestedRuns: N,
        completedRuns: runs.length,
        failedRuns: errors.length,
        uniqueCodes: uniqueCodes.size,
        dupRate,
        kindDistribution: kindCounts,
        meanGenerationCostUsd: runs.length > 0 ? generationCostUsd / runs.length : 0,
        totalGenerationCostUsd: generationCostUsd,
        selfGradeAvg,
        selfGradeCostUsd,
        sampleProposals: runs.slice(0, 5).map((r) => r.proposal),
      },
    };
  },
};

export const achievementCalibrationCases: EvalCase[] = [calibration];
