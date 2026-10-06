// Edge Function: generate-collection
// Takes a free-form user prompt and returns a structured collection draft
// produced by the SAME multi-agent pipeline that powers the weekly
// generator (`scripts/generate-collection.ts`). Single source of truth lives
// in `src/agents/` — Deno reads it directly via the
// allowImportingTsExtensions setting + the deno.json import map for
// `@anthropic-ai/sdk`. No code duplication between user-facing and cron
// generation.
//
// Per-call shape: 1 coordinator turn → 4 parallel subagent turns → merge.
// Slightly higher latency than the old monolithic prompt (5 small calls
// instead of 1 big one) but ai_hints stay strictly English, rarity is
// classified per-item, and fun_facts come from a dedicated turn.
//
// Invoke: POST /functions/v1/generate-collection
// Body:   { prompt: string, locale?: 'en'|'ru'|'pl'|'uk' }
// Auth:   user JWT required (forwarded by Supabase)

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

import { authenticateRequest } from '../_shared/auth.ts';
import { logAiCall } from '../_shared/anthropic-usage.ts';
import { CORS_HEADERS, handlePreflight } from '../_shared/cors.ts';
// prettier-ignore
import { ANTHROPIC_MAX_RETRIES, ANTHROPIC_TIMEOUT_GENERATION_MS } from '../_shared/anthropic-config.ts';

// Shared agents — same files Node-side scripts use.
import { runCoordinator } from '../../../src/agents/coordinator.ts';
import { runDescriptions } from '../../../src/agents/subagent-descriptions.ts';
import { runValidationHints } from '../../../src/agents/subagent-validation.ts';
import { runRarity } from '../../../src/agents/subagent-rarity.ts';
import { runFunFacts } from '../../../src/agents/subagent-funfact.ts';
import { mergeAndValidate } from '../../../src/agents/merge.ts';
import { sumUsage, type Locale } from '../../../src/agents/types.ts';
import { fetchExampleImagesForNames } from '../../../src/agents/image-fetcher.ts';
import { mirrorImagesByName } from '../../../src/agents/image-mirror.ts';
import { runImageQueryRewriter } from '../../../src/agents/subagent-image-query.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
// Explicit limits so a slow upstream lands in coordinator_failed /
// subagent_failed (502) instead of a gateway timeout. The same client is
// passed into every src/agents/* call. See _shared/anthropic-config.ts.
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  timeout: ANTHROPIC_TIMEOUT_GENERATION_MS,
  maxRetries: ANTHROPIC_MAX_RETRIES,
});

const DAILY_LIMIT = 5;
// Same model as validate-find / award-xp / weekly cron — Haiku 4.5 is plenty
// for tool-use turns this small, and the multi-agent split makes per-call
// reasoning shallow enough that Sonnet doesn't pay back.
const MODEL = 'claude-haiku-4-5-20251001';
const KIND = 'collection';

const LOCALES: readonly Locale[] = ['en', 'ru', 'pl', 'uk'];

// Free-form user input → coordinator-friendly seed. The coordinator already
// owns title/description/items[].name; we don't need to hand-write a prompt
// scaffold the way the old monolithic version did. We just pass the user's
// idea straight through as the topic.
const DEFAULT_ITEM_COUNT = 15;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function checkRateLimit(userId: string): Promise<{ ok: boolean; used: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from('ai_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', KIND)
    .gte('created_at', since);
  if (error) throw error;
  const used = count ?? 0;
  return { ok: used < DAILY_LIMIT, used };
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const auth = await authenticateRequest(req);
  if (!auth.ok) return json(auth.status, { error: auth.error });
  const userId = auth.userId;

  let body: { prompt?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (prompt.length < 3) return json(400, { error: 'prompt is required' });
  if (prompt.length > 500) return json(400, { error: 'prompt is too long' });

  const locale: Locale =
    typeof body.locale === 'string' && (LOCALES as readonly string[]).includes(body.locale)
      ? (body.locale as Locale)
      : 'en';

  try {
    const { ok, used } = await checkRateLimit(userId);
    if (!ok) {
      return json(429, {
        error: 'rate_limited',
        limit: DAILY_LIMIT,
        used,
      });
    }
  } catch (err) {
    return json(500, { error: 'rate_limit_check_failed', message: String(err) });
  }

  // Coordinator: title + description + item names. With no category passed
  // in, the coordinator picks the most appropriate one from the enum based
  // on the user's prompt — we don't have a topic-picker step here the way
  // the cron does, so the model owns category selection.
  let coord;
  try {
    coord = await runCoordinator(anthropic, MODEL, {
      topic: prompt,
      count: DEFAULT_ITEM_COUNT,
      locale,
    });
  } catch (err) {
    return json(502, { error: 'coordinator_failed', message: String(err) });
  }

  // 5 LLM subagents in parallel — including the image-query rewriter that
  // collapses descriptive item names into tight Wikipedia/Unsplash search
  // queries. Each takes ONLY the item names so they can run independently;
  // the merge step rejoins everything by name.
  let descs, hints, rarity, facts, queries;
  try {
    [descs, hints, rarity, facts, queries] = await Promise.all([
      runDescriptions(anthropic, MODEL, coord.plan.title, coord.plan.itemNames, locale),
      runValidationHints(anthropic, MODEL, coord.plan.title, coord.plan.itemNames),
      runRarity(anthropic, MODEL, coord.plan.title, coord.plan.itemNames),
      runFunFacts(anthropic, MODEL, coord.plan.title, coord.plan.itemNames, locale),
      runImageQueryRewriter(anthropic, MODEL, coord.plan.title, coord.plan.itemNames),
    ]);
  } catch (err) {
    return json(502, { error: 'subagent_failed', message: String(err) });
  }

  // Image fetch with rewritten queries. Wrapped in catch so a
  // Wikipedia / Unsplash outage never blocks the collection itself; we
  // just end up with null image URLs and the UI falls back to category
  // emojis.
  //
  // Then mirror each fetched URL into our Storage bucket — Wikimedia
  // rate-limits `upload.wikimedia.org` per-IP for mobile clients (HTTP 429),
  // so storing external URLs in the DB shows up as permanent loading
  // placeholders on-device. See src/agents/image-mirror.ts.
  let imagesByName: Record<string, string | null> = {};
  try {
    const queriesForFetch = coord.plan.itemNames.map((n: string) => queries.byName[n] ?? n);
    const byQuery = await fetchExampleImagesForNames(queriesForFetch);
    for (const name of coord.plan.itemNames) {
      const q = queries.byName[name] ?? name;
      imagesByName[name] = byQuery[q] ?? null;
    }
    imagesByName = await mirrorImagesByName(imagesByName, {
      supabaseUrl: SUPABASE_URL,
      serviceRoleKey: SERVICE_ROLE_KEY,
      client: admin,
    });
  } catch (err) {
    console.error('image fetch/mirror failed', err);
  }

  let merged;
  try {
    merged = mergeAndValidate(
      coord.plan,
      descs.data,
      hints.data,
      rarity.data,
      facts.data,
      imagesByName
    );
  } catch (err) {
    return json(502, { error: 'merge_failed', message: String(err) });
  }

  // Cost log: one row per stage so dashboards can break down where the
  // budget went (coordinator vs subagents).
  const subagentUsage = sumUsage(
    descs.usage,
    hints.usage,
    rarity.usage,
    facts.usage,
    queries.usage
  );
  await Promise.all([
    logAiCall(admin, 'generate-collection:coordinator', MODEL, coord.usage, {
      user_id: userId,
      prompt,
    }),
    logAiCall(admin, 'generate-collection:subagents', MODEL, subagentUsage, {
      user_id: userId,
      items: merged.items.length,
    }),
  ]);

  // Best-effort log; don't fail the request if logging fails.
  const { error: logError } = await admin
    .from('ai_generations')
    .insert({ user_id: userId, kind: KIND, prompt });
  if (logError) console.error('ai_generations insert failed', logError);

  // Response shape stays the same as before so the client (AiDraftSchema in
  // src/schemas/index.ts) keeps parsing correctly. MergedCollection is
  // structurally identical to the old GeneratedCollection.
  return json(200, { draft: merged });
});
