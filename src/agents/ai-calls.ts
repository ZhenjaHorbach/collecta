// Cost tracking for Node-side Anthropic call sites (cron generators in
// `scripts/`). Mirrors `supabase/functions/_shared/anthropic-usage.ts →
// logAiCall` so every paid call lands in the same `ai_calls` table (migration
// 015). The Deno copy uses `npm:` specifiers that Node can't resolve, so the
// insert shape is duplicated here — when you change one, change the other.
//
// Best-effort: never throws. A cost-tracking failure must not fail the cron
// run that already paid for the tokens. Writes only to stderr — the scripts'
// stdout is parsed as JSON by the workflows.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { NormalizedUsage } from './types';

export async function logAiCall(
  client: SupabaseClient,
  kind: string,
  model: string,
  usage: NormalizedUsage,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await client.from('ai_calls').insert({
      kind,
      model,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_tokens: usage.cache_read_tokens,
      cache_creation_tokens: usage.cache_creation_tokens,
      metadata: metadata ?? null,
    });
    if (error) console.error(`[ai_calls] insert failed kind=${kind}`, error);
  } catch (err) {
    console.error(`[ai_calls] insert threw kind=${kind}`, err);
  }
}

// `ai_calls` has no client policies — inserts need the service role. Skips
// with a warning when the key isn't configured (local runs without it, or a
// workflow that doesn't pass it).
export async function logAiCallFromEnv(
  kind: string,
  model: string,
  usage: NormalizedUsage,
  metadata?: Record<string, unknown>
): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.warn(
      `[ai_calls] SUPABASE_SERVICE_ROLE_KEY missing — skipping ai_calls log kind=${kind}`
    );
    return;
  }
  await logAiCall(createClient(url, serviceRoleKey), kind, model, usage, metadata);
}
