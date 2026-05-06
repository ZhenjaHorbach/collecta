// Shared cost-tracking helpers for every Anthropic call site.
//
// Why: per CLAUDE.md → AI cost tracking, every call site must capture
// `message.usage` in normalized form. With three+ sites (validate-find,
// award-xp, starter-generator) the mini variant (per-row columns on a parent
// table) no longer makes sense — we use the dedicated `ai_calls` table from
// migration 015 instead. Existing per-row columns stay until readers move
// over; new code logs only here.
//
// Pure where possible. extractUsage / sumUsage have no I/O so they can be
// imported from Node tests too.

// @ts-ignore — Deno npm specifier
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
}

interface RawUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

// Anthropic's SDK names the cache fields with `_input_tokens`. We collapse to
// the shorter names that match our DB columns so logAiCall's call site stays
// flat.
export function extractUsage(message: { usage?: RawUsage }): AnthropicUsage {
  const u = message.usage ?? {};
  return {
    input_tokens: u.input_tokens ?? 0,
    output_tokens: u.output_tokens ?? 0,
    cache_read_tokens: u.cache_read_input_tokens ?? 0,
    cache_creation_tokens: u.cache_creation_input_tokens ?? 0,
  };
}

export const ZERO_USAGE: AnthropicUsage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_tokens: 0,
  cache_creation_tokens: 0,
};

export function sumUsage(...parts: AnthropicUsage[]): AnthropicUsage {
  return parts.reduce(
    (acc, p) => ({
      input_tokens: acc.input_tokens + p.input_tokens,
      output_tokens: acc.output_tokens + p.output_tokens,
      cache_read_tokens: acc.cache_read_tokens + p.cache_read_tokens,
      cache_creation_tokens: acc.cache_creation_tokens + p.cache_creation_tokens,
    }),
    ZERO_USAGE
  );
}

// Best-effort log. We never let cost-tracking failures take down the
// underlying request — every caller continues if this throws.
export async function logAiCall(
  admin: SupabaseClient,
  kind: string,
  model: string,
  usage: AnthropicUsage,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await admin.from('ai_calls').insert({
    kind,
    model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_read_tokens: usage.cache_read_tokens,
    cache_creation_tokens: usage.cache_creation_tokens,
    metadata: metadata ?? null,
  });
  if (error) console.error(`[ai_calls] insert failed kind=${kind}`, error);
}
