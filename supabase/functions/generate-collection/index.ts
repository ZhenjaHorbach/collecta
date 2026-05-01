// Edge Function: generate-collection
// Takes a free-form user prompt and returns a structured collection draft
// produced by Claude. Never exposes the Anthropic key to the client.
//
// Invoke: POST /functions/v1/generate-collection
// Body:   { prompt: string, locale?: 'en'|'ru'|'pl'|'uk' }
// Auth:   user JWT required (forwarded by Supabase)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

// @ts-ignore — Deno npm specifier
import { createClient } from 'npm:@supabase/supabase-js@2';
// @ts-ignore — Deno npm specifier
import Anthropic from 'npm:@anthropic-ai/sdk';

// @ts-ignore — Deno requires .ts extension on relative imports
import {
  buildPrompt,
  extractJson,
  validate,
  LOCALES,
  type GeneratedCollection,
  type Locale,
} from './validation';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const DAILY_LIMIT = 5;
const MODEL = 'claude-opus-4-7';
const KIND = 'collection';

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
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
  if (req.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const userId = await getUserId(req);
  if (!userId) return json(401, { error: 'Unauthorized' });

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

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: buildPrompt(prompt, locale) }],
    });
  } catch (err) {
    return json(502, { error: 'model_call_failed', message: String(err) });
  }

  const textBlock = response.content.find((b: { type: string }) => b.type === 'text') as
    | { type: 'text'; text: string }
    | undefined;
  if (!textBlock) return json(502, { error: 'model_returned_no_text' });

  let draft: GeneratedCollection;
  try {
    draft = validate(extractJson(textBlock.text));
  } catch (err) {
    return json(502, { error: 'invalid_model_output', message: String(err) });
  }

  // Best-effort log; don't fail the request if logging fails.
  const { error: logError } = await admin
    .from('ai_generations')
    .insert({ user_id: userId, kind: KIND, prompt });
  if (logError) console.error('ai_generations insert failed', logError);

  return json(200, { draft });
});
