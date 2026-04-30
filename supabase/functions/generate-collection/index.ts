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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const DAILY_LIMIT = 5;
const MODEL = 'claude-opus-4-7';
const KIND = 'collection';

const CATEGORIES = [
  'nature',
  'urban',
  'animals',
  'food',
  'transport',
  'art',
  'sports',
  'visual',
  'seasonal',
  'travel',
] as const;
type Category = (typeof CATEGORIES)[number];

const RARITIES = ['common', 'uncommon', 'rare'] as const;
type Rarity = (typeof RARITIES)[number];

const LOCALES = ['en', 'ru', 'pl', 'uk'] as const;
type Locale = (typeof LOCALES)[number];

interface GeneratedItem {
  name: string;
  description: string;
  ai_hint: string;
  rarity: Rarity;
  fun_fact: string;
}

interface GeneratedCollection {
  title: string;
  description: string;
  category: Category;
  items: GeneratedItem[];
}

const LANGUAGE_NAME: Record<Locale, string> = {
  en: 'English',
  ru: 'Russian',
  pl: 'Polish',
  uk: 'Ukrainian',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildPrompt(userInput: string, locale: Locale): string {
  return `User wants to create a real-world photo collection about: "${userInput}"

Generate a complete collection structure as a single JSON object with this exact shape:
{
  "title": "short catchy title (under 50 chars)",
  "description": "2-3 sentences explaining what this collection is about",
  "category": "one of: ${CATEGORIES.join('|')}",
  "items": [
    {
      "name": "item name (under 60 chars)",
      "description": "what to look for, one sentence",
      "ai_hint": "instruction for AI photo validation — what must be visible in the frame",
      "rarity": "one of: ${RARITIES.join('|')}",
      "fun_fact": "one short, interesting fact"
    }
  ]
}

Rules:
- Generate between 10 and 20 items.
- All user-facing text (title, description, items[].name/description/fun_fact) must be in ${LANGUAGE_NAME[locale]}.
- ai_hint stays in English so a downstream model can parse it consistently.
- Be specific, fun, and realistically photographable in the real world.
- Output only the JSON object — no prose, no markdown fences.`;
}

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model output did not contain a JSON object');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function asString(v: unknown, field: string, max: number): string {
  if (typeof v !== 'string') throw new Error(`${field} must be a string`);
  const s = v.trim();
  if (s.length === 0) throw new Error(`${field} must not be empty`);
  return s.slice(0, max);
}

function asEnum<T extends string>(v: unknown, field: string, allowed: readonly T[]): T {
  if (typeof v !== 'string' || !allowed.includes(v as T)) {
    throw new Error(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return v as T;
}

function validate(raw: unknown): GeneratedCollection {
  if (!raw || typeof raw !== 'object') throw new Error('Output is not an object');
  const obj = raw as Record<string, unknown>;
  const title = asString(obj.title, 'title', 80);
  const description = asString(obj.description, 'description', 500);
  const category = asEnum(obj.category, 'category', CATEGORIES);
  if (!Array.isArray(obj.items)) throw new Error('items must be an array');
  if (obj.items.length < 5) throw new Error('items must contain at least 5 entries');

  const items: GeneratedItem[] = obj.items.slice(0, 20).map((rawItem, i) => {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new Error(`items[${i}] must be an object`);
    }
    const item = rawItem as Record<string, unknown>;
    return {
      name: asString(item.name, `items[${i}].name`, 80),
      description: asString(item.description, `items[${i}].description`, 280),
      ai_hint: asString(item.ai_hint, `items[${i}].ai_hint`, 280),
      rarity: asEnum(item.rarity, `items[${i}].rarity`, RARITIES),
      fun_fact: asString(item.fun_fact, `items[${i}].fun_fact`, 280),
    };
  });

  return { title, description, category, items };
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
