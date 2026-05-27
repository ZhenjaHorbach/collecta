// Edge Function: award-xp
//
// CCAF Domain 1 — Agentic Architecture.
// Runs a real Anthropic tool-use loop after every gamification event (find /
// reaction / collection_complete). The model decides the order of:
//   1. get_user_stats(user_id)
//   2. check_achievements(stats)        → which achievement codes are now met
//   3. update_user_xp(user_id, xp_delta)→ writes XP, recomputes level + streak
//   4. unlock_achievement(user_id, code)→ inserts user_achievements row(s)
// The loop terminates when stop_reason === 'end_turn' (no more tool_use).
//
// Token usage from EVERY step of the loop is summed and persisted to the
// shared `ai_calls` table via `_shared/anthropic-usage.ts` — the canonical
// AI cost tracking path. The mini-variant columns on user_achievements are
// also still populated for now until readers move to ai_calls; see
// src/services/CLAUDE.md.
//
// Invoke: POST /functions/v1/award-xp
// Body:   { user_id: string, event: 'find'|'reaction'|'collection_complete' }
// Reply:  200 { xp_delta, new_xp, new_level, leveled_up, streak_days,
//               new_achievements: [{code,title,icon,xp_reward}], usage }
//         400 invalid_json | missing_fields | invalid_event
//         502 agent_failed
//
// Logs: every step prints `[award-xp][step N] tool=... input=... output=...`
// for tail-friendly debugging via `supabase functions logs award-xp --follow`.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

// @ts-ignore — Deno npm specifier
import { createClient } from 'npm:@supabase/supabase-js@2';
// @ts-ignore — Deno npm specifier
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';

// @ts-ignore — Deno requires .ts extension on relative imports
import { authorizeRequest } from '../_shared/auth.ts';
// @ts-ignore — Deno requires .ts extension on relative imports
// prettier-ignore
import { levelForXp, todayUtcIso, updateStreak, XP_PER_EVENT, type XpEvent } from '../_shared/leveling.ts';
// @ts-ignore — Deno requires .ts extension on relative imports
import { logAiCall } from '../_shared/anthropic-usage.ts';
// @ts-ignore — Deno requires .ts extension on relative imports
import { CORS_HEADERS, handlePreflight } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_LOOP_STEPS = 8; // safety net — usually 2–3 turns is enough

// ─── tool schemas ─────────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'get_user_stats',
    description:
      'Read current XP, level, streak, and event counts for the user. Always call this first.',
    input_schema: {
      type: 'object',
      properties: { user_id: { type: 'string', description: 'UUID of the user.' } },
      required: ['user_id'],
    },
  },
  {
    name: 'check_achievements',
    description:
      'Given the current stats, return achievement codes the user newly qualifies for (excludes already-unlocked).',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        stats: {
          type: 'object',
          properties: {
            xp: { type: 'number' },
            level: { type: 'number' },
            streak_days: { type: 'number' },
            finds_count: { type: 'number' },
            reactions_given: { type: 'number' },
            collections_complete: { type: 'number' },
          },
          required: [
            'xp',
            'level',
            'streak_days',
            'finds_count',
            'reactions_given',
            'collections_complete',
          ],
        },
      },
      required: ['user_id', 'stats'],
    },
  },
  {
    name: 'update_user_xp',
    description:
      'Apply an XP delta to the user, recompute level, and (for find events only) advance the streak based on last_find_date. Returns the new totals.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        xp_delta: {
          type: 'number',
          description: 'Signed XP to add. Use the values from the rules in the system prompt.',
        },
        is_find_event: {
          type: 'boolean',
          description:
            'True only when this delta comes from a find event — controls streak advance.',
        },
      },
      required: ['user_id', 'xp_delta', 'is_find_event'],
    },
  },
  {
    name: 'unlock_achievement',
    description:
      'Persist an unlocked achievement for the user and award its bonus XP. Idempotent: returns unlocked=false if the row already exists.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        code: { type: 'string' },
      },
      required: ['user_id', 'code'],
    },
  },
] as const;

const SYSTEM_PROMPT = `You are the Collecta gamification agent. After a player event you decide how XP and achievements update.

Rules (do not invent your own values):
- find:                +${XP_PER_EVENT.find} XP, advances streak.
- reaction:            +${XP_PER_EVENT.reaction} XP, does NOT advance streak.
- collection_complete: +${XP_PER_EVENT.collection_complete} XP, does NOT advance streak.
- recheck:             +0 XP. SKIP update_user_xp entirely. Only re-run the achievement matcher (used when the user re-saves an existing find).

Procedure:
1. Call get_user_stats first.
2. If event is "recheck", skip this step. Otherwise call update_user_xp with the base delta for the event (and is_find_event accordingly). Use the new stats it returns going forward.
3. Call check_achievements with the freshest stats.
4. For each returned code call unlock_achievement (the tool itself awards the bonus XP — do not re-add it via update_user_xp).
5. When done, reply with a one-line summary like "ok: +N xp, M unlock(s)" and stop. Do not produce extra prose.`;

// ─── tool result types (what we return into the model's tool_result) ──────────
interface UserStats {
  xp: number;
  level: number;
  streak_days: number;
  last_find_date: string | null;
  finds_count: number;
  reactions_given: number;
  collections_complete: number;
}

interface UpdateXpResult {
  new_xp: number;
  new_level: number;
  leveled_up: boolean;
  streak_days: number;
  last_find_date: string | null;
}

interface UnlockResult {
  unlocked: boolean;
  code: string;
  title?: string;
  icon?: string;
  xp_reward?: number;
  new_xp?: number;
  new_level?: number;
  leveled_up?: boolean;
}

interface AggregatedUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

// ─── tool implementations ─────────────────────────────────────────────────────
async function getUserStats(userId: string): Promise<UserStats> {
  const [{ data: user }, { count: findsCount }, { count: reactionsGiven }, completedCount] =
    await Promise.all([
      supabase
        .from('users')
        .select('xp, level, streak_days, last_find_date')
        .eq('id', userId)
        .single(),
      supabase.from('finds').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('reactions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      countCompletedCollections(userId),
    ]);

  return {
    xp: user?.xp ?? 0,
    level: user?.level ?? 1,
    streak_days: user?.streak_days ?? 0,
    last_find_date: (user?.last_find_date as string | null) ?? null,
    finds_count: findsCount ?? 0,
    reactions_given: reactionsGiven ?? 0,
    collections_complete: completedCount,
  };
}

// Single round-trip via SQL function (migration 010). Replaces a previous
// 1 + 2K client-side loop. Empty collections don't count as complete.
async function countCompletedCollections(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('count_completed_collections', { uid: userId });
  if (error) throw error;
  return Number(data ?? 0);
}

interface AchievementRow {
  id: string;
  code: string;
  title: string;
  icon: string;
  xp_reward: number;
  condition: { kind: string; gte: number };
}

async function checkAchievements(
  userId: string,
  stats: Omit<UserStats, 'last_find_date'>
): Promise<string[]> {
  const [{ data: catalog }, { data: unlocked }] = await Promise.all([
    supabase.from('achievements').select('code, condition'),
    supabase
      .from('user_achievements')
      .select('achievement_id, achievements(code)')
      .eq('user_id', userId),
  ]);
  if (!catalog) return [];

  type UnlockedRow = { achievement_id: string; achievements: { code: string } | null };
  const unlockedCodes = new Set<string>(
    ((unlocked ?? []) as UnlockedRow[])
      .map((r) => r.achievements?.code)
      .filter((c): c is string => typeof c === 'string')
  );

  const out: string[] = [];
  for (const a of catalog as Array<{ code: string; condition: { kind: string; gte: number } }>) {
    if (unlockedCodes.has(a.code)) continue;
    if (matches(a.condition, stats)) out.push(a.code);
  }
  return out;
}

function matches(
  cond: { kind: string; gte: number },
  stats: Omit<UserStats, 'last_find_date'>
): boolean {
  switch (cond.kind) {
    case 'finds_count':
      return stats.finds_count >= cond.gte;
    case 'streak_days':
      return stats.streak_days >= cond.gte;
    case 'reactions_given':
      return stats.reactions_given >= cond.gte;
    case 'collections_complete':
      return stats.collections_complete >= cond.gte;
    default:
      return false;
  }
}

async function updateUserXp(
  userId: string,
  xpDelta: number,
  isFindEvent: boolean
): Promise<UpdateXpResult> {
  const { data: user } = await supabase
    .from('users')
    .select('xp, streak_days, last_find_date')
    .eq('id', userId)
    .single();
  const prevXp = user?.xp ?? 0;
  const newXp = prevXp + xpDelta;
  const { level: prevLevel } = levelForXp(prevXp);
  const { level: newLevel } = levelForXp(newXp);

  let streakDays = user?.streak_days ?? 0;
  let lastFindDate = (user?.last_find_date as string | null) ?? null;
  if (isFindEvent) {
    const s = updateStreak(streakDays, lastFindDate, todayUtcIso());
    streakDays = s.streakDays;
    lastFindDate = s.lastFindDate;
  }

  await supabase
    .from('users')
    .update({
      xp: newXp,
      level: newLevel,
      streak_days: streakDays,
      last_find_date: lastFindDate,
    })
    .eq('id', userId);

  return {
    new_xp: newXp,
    new_level: newLevel,
    leveled_up: newLevel > prevLevel,
    streak_days: streakDays,
    last_find_date: lastFindDate,
  };
}

async function unlockAchievement(userId: string, code: string): Promise<UnlockResult> {
  const { data: ach } = await supabase
    .from('achievements')
    .select('id, code, title, icon, xp_reward')
    .eq('code', code)
    .single<AchievementRow>();
  if (!ach) return { unlocked: false, code };

  // Idempotent insert: ignore conflict on (user_id, achievement_id).
  const { data: inserted, error } = await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_id: ach.id })
    .select('user_id')
    .maybeSingle();
  if (error && error.code !== '23505') throw error;
  if (!inserted) return { unlocked: false, code };

  // Award the bonus XP for unlocking. Streak does not advance — this isn't a
  // find event.
  const xpResult = await updateUserXp(userId, ach.xp_reward, false);

  return {
    unlocked: true,
    code: ach.code,
    title: ach.title,
    icon: ach.icon,
    xp_reward: ach.xp_reward,
    new_xp: xpResult.new_xp,
    new_level: xpResult.new_level,
    leveled_up: xpResult.leveled_up,
  };
}

// ─── tool dispatch ────────────────────────────────────────────────────────────
async function dispatch(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_user_stats':
      return await getUserStats(input.user_id as string);
    case 'check_achievements':
      return {
        codes: await checkAchievements(
          input.user_id as string,
          input.stats as Omit<UserStats, 'last_find_date'>
        ),
      };
    case 'update_user_xp':
      return await updateUserXp(
        input.user_id as string,
        input.xp_delta as number,
        input.is_find_event as boolean
      );
    case 'unlock_achievement':
      return await unlockAchievement(input.user_id as string, input.code as string);
    default:
      throw new Error(`unknown_tool:${name}`);
  }
}

// ─── agent loop ───────────────────────────────────────────────────────────────
interface AgentResult {
  newAchievements: UnlockResult[];
  finalXp: number;
  finalLevel: number;
  leveledUp: boolean;
  streakDays: number;
  usage: AggregatedUsage;
  steps: number;
}

async function runAgentLoop(userId: string, event: XpEvent): Promise<AgentResult> {
  const messages: unknown[] = [
    {
      role: 'user',
      content: `Event: ${event}\nuser_id: ${userId}\nFollow the procedure.`,
    },
  ];

  const usage: AggregatedUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
  };
  const newAchievements: UnlockResult[] = [];
  let finalXp = 0;
  let finalLevel = 1;
  let leveledUp = false;
  let streakDays = 0;
  let prevLevelSeen = -1;

  for (let step = 1; step <= MAX_LOOP_STEPS; step++) {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: TOOLS,
      system: SYSTEM_PROMPT,
      messages,
    });

    const u = message.usage ?? {};
    usage.inputTokens += u.input_tokens ?? 0;
    usage.outputTokens += u.output_tokens ?? 0;
    usage.cacheReadInputTokens += u.cache_read_input_tokens ?? 0;
    usage.cacheCreationInputTokens += u.cache_creation_input_tokens ?? 0;

    messages.push({ role: 'assistant', content: message.content });

    if (message.stop_reason !== 'tool_use') {
      console.log(`[award-xp][step ${step}] stop=${message.stop_reason} — loop done`);
      return { newAchievements, finalXp, finalLevel, leveledUp, streakDays, usage, steps: step };
    }

    const toolResults: unknown[] = [];
    interface ToolUseBlock {
      type: 'tool_use';
      id: string;
      name: string;
      input?: Record<string, unknown>;
    }
    type ContentBlock = ToolUseBlock | { type: string };
    for (const block of message.content as ContentBlock[]) {
      if (block.type !== 'tool_use') continue;
      const toolBlock = block as ToolUseBlock;
      const out = await dispatch(toolBlock.name, toolBlock.input ?? {});
      console.log(
        `[award-xp][step ${step}] tool=${toolBlock.name} input=${JSON.stringify(toolBlock.input)} output=${JSON.stringify(out)}`
      );

      // Track final state as it changes. get_user_stats seeds defaults so
      // recheck events (which skip update_user_xp by design) still return
      // the user's actual XP/level/streak instead of the zero-initialised
      // values from the top of this function.
      if (toolBlock.name === 'get_user_stats') {
        const r = out as UserStats;
        finalXp = r.xp;
        finalLevel = r.level;
        streakDays = r.streak_days;
      }
      if (toolBlock.name === 'update_user_xp') {
        const r = out as UpdateXpResult;
        if (prevLevelSeen === -1) prevLevelSeen = r.new_level;
        finalXp = r.new_xp;
        finalLevel = r.new_level;
        streakDays = r.streak_days;
        if (r.leveled_up) leveledUp = true;
      }
      if (toolBlock.name === 'unlock_achievement') {
        const r = out as UnlockResult;
        if (r.unlocked) {
          newAchievements.push(r);
          if (r.new_xp !== undefined) finalXp = r.new_xp;
          if (r.new_level !== undefined) finalLevel = r.new_level;
          if (r.leveled_up) leveledUp = true;
        }
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify(out),
      });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  console.warn(`[award-xp] hit MAX_LOOP_STEPS=${MAX_LOOP_STEPS} — bailing`);
  return {
    newAchievements,
    finalXp,
    finalLevel,
    leveledUp,
    streakDays,
    usage,
    steps: MAX_LOOP_STEPS,
  };
}

// ─── persist usage on unlocks (mini variant) ──────────────────────────────────
async function persistUsageOnUnlocks(
  userId: string,
  newAchievements: UnlockResult[],
  usage: AggregatedUsage
): Promise<void> {
  if (newAchievements.length === 0) return;

  // Spread the agent-loop usage across all unlocks from this run by writing the
  // same aggregated row on each. Avoids picking a "primary" unlock and lets
  // sum-by-user queries treat each unlock as independent.
  const codes = newAchievements.map((a) => a.code);
  const { data: rows } = await supabase.from('achievements').select('id, code').in('code', codes);
  if (!rows) return;

  const idByCode = new Map<string, string>(
    (rows as Array<{ id: string; code: string }>).map((r) => [r.code, r.id])
  );

  await Promise.all(
    newAchievements.map((a) => {
      const id = idByCode.get(a.code);
      if (!id) return Promise.resolve();
      return supabase
        .from('user_achievements')
        .update({
          ai_model: MODEL,
          ai_input_tokens: usage.inputTokens,
          ai_output_tokens: usage.outputTokens,
          ai_cache_read_tokens: usage.cacheReadInputTokens,
          ai_cache_creation_tokens: usage.cacheCreationInputTokens,
        })
        .eq('user_id', userId)
        .eq('achievement_id', id);
    })
  );
}

// ─── http entry ───────────────────────────────────────────────────────────────
interface RequestBody {
  user_id?: string;
  event?: string;
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'invalid_json');
  }

  const userId = body.user_id;
  const event = body.event as XpEvent | undefined;
  if (!userId || !event) return jsonError(400, 'missing_fields');
  if (!(event in XP_PER_EVENT)) return jsonError(400, 'invalid_event');

  // Authorize the caller — without this any logged-in user could POST
  // { user_id: <victim>, event: 'find' } and grant another account XP and
  // achievements. See .claude/rules/supabase.md → "Edge function caller auth".
  const auth = await authorizeRequest(req, userId);
  if (!auth.ok) return jsonError(auth.status, auth.error);

  let result: AgentResult;
  try {
    result = await runAgentLoop(userId, event);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[award-xp] agent_failed: ${detail}`);
    return jsonError(502, 'agent_failed', detail);
  }

  try {
    await persistUsageOnUnlocks(userId, result.newAchievements, result.usage);
  } catch (err) {
    // Non-fatal — XP and unlocks already wrote successfully.
    console.error(`[award-xp] persist_usage_failed: ${err}`);
  }

  // Normalized cost tracking — every loop run lands in ai_calls regardless of
  // whether an unlock fired. The mini variant on user_achievements stays
  // populated above until readers move to ai_calls.
  await logAiCall(
    supabase,
    `award-xp:${event}`,
    MODEL,
    {
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      cache_read_tokens: result.usage.cacheReadInputTokens,
      cache_creation_tokens: result.usage.cacheCreationInputTokens,
    },
    {
      user_id: userId,
      steps: result.steps,
      achievements_unlocked: result.newAchievements.map((a) => a.code),
    }
  );

  // xp_delta from the caller's perspective: base event XP + any unlock bonuses.
  const baseDelta = XP_PER_EVENT[event];
  const bonusDelta = result.newAchievements.reduce((s, a) => s + (a.xp_reward ?? 0), 0);

  return new Response(
    JSON.stringify({
      xp_delta: baseDelta + bonusDelta,
      new_xp: result.finalXp,
      new_level: result.finalLevel,
      leveled_up: result.leveledUp,
      streak_days: result.streakDays,
      new_achievements: result.newAchievements.map((a) => ({
        code: a.code,
        title: a.title,
        icon: a.icon,
        xp_reward: a.xp_reward,
      })),
      usage: {
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        cache_read_tokens: result.usage.cacheReadInputTokens,
        cache_creation_tokens: result.usage.cacheCreationInputTokens,
        steps: result.steps,
      },
      model: MODEL,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
  );
});

function jsonError(status: number, error: string, detail?: string): Response {
  return new Response(JSON.stringify(detail ? { error, detail } : { error }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
