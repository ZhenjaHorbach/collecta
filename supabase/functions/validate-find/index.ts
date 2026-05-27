// Edge Function: validate-find
// Validates a photo against a collection item via Claude Vision and returns
// the structured verdict. **Does not** write to the finds table — the client
// creates the find row only after the user confirms Save, with the validation
// result baked in. This prevents orphan rows when the user retakes or
// discards.
//
// Invoke: POST /functions/v1/validate-find
// Body:   {
//           photo_url: string,
//           mode?: 'verify' | 'match-in-collection' | 'discover',
//           collection_item_id?: string,   // required when mode='verify'
//           collection_id?: string,        // required when mode='match-in-collection'
//         }
//         When mode is omitted it is inferred: item_id → verify,
//         collection_id only → match-in-collection, neither → discover.
// Reply:  200 {
//           result: ValidationResult,
//           mode: 'verify' | 'match-in-collection' | 'discover',
//           matched_collection_id: string | null,
//           matched_item_id: string | null,
//           candidate_items: Candidate[],         // [] in verify mode
//           candidate_collections: Candidate[],   // [] in verify/match-in-collection modes
//           model: string,
//           usage: ApiUsage,
//         }
//         400 { error: 'invalid_json' | 'photo_url_required'
//             | 'collection_item_id_required_for_verify'
//             | 'collection_id_required_for_match_in_collection' }
//         404 { error: 'collection_item_not_found' | 'collection_not_found' }
//         422 { error: 'missing_collection_description_or_item_name'
//             | 'collection_has_no_items' | 'user_has_no_collections' }
//         502 { error: 'vision_failed', detail: string }
//
// Token usage is returned alongside the result so the client can persist it
// on the finds row at commit time (see CLAUDE.md → AI cost tracking).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

// @ts-ignore — Deno npm specifier
import { createClient } from 'npm:@supabase/supabase-js@2';
// @ts-ignore — Deno npm specifier
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';

// @ts-ignore — Deno requires .ts extension on relative imports
import { authenticateRequest } from '../_shared/auth.ts';
// @ts-ignore — Deno requires .ts extension on relative imports
// prettier-ignore
import { logAiCall, type AnthropicUsage } from '../_shared/anthropic-usage.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

const MODEL = 'claude-haiku-4-5-20251001';

// Static instructions — frozen across all calls so they sit in the cached prefix.
// Per-find context (collection description, item name) is rendered into the
// final user turn instead, AFTER the breakpoint, so it stays out of the cache key.
const SYSTEM_INSTRUCTIONS = `You are validating a photo for a collection app.
Use the validate_photo tool to respond. Be strict but fair:
- valid=true only when the claimed item is clearly identifiable.
- confidence reflects how certain you are (0=guess, 1=certain).
- detected describes what you actually see in the photo, not what the user claimed.
- suggestion is short, kind, actionable help for the user (e.g. "get closer", "try better lighting").`;

// Per-find context — uncached. The decision rules live here (not in the
// cached system prompt) so we can tune strictness without busting the
// cache. Without these rules the model treats "fits the collection theme"
// as enough: a Warsaw church passed as a Warsaw mermaid statue with 95%
// confidence because it correctly inferred the surrounding theme.
const USER_CONTEXT_TEMPLATE = `Collection: {collection_description}
Claimed item: {item_name}

Decision rules — read carefully and apply in order:

STEP 1. Identify the PRIMARY SUBJECT of the photo — the thing that fills the most of the frame and is clearly what the photographer aimed at. Write this into "detected" as a concrete noun phrase. Examples of good "detected" values: "a Gothic red-brick church with two spires", "a bronze statue of a mermaid holding a sword", "a tabby cat sitting on a wooden floor". Examples of BAD "detected" values (vague, evasive, location-only): "a view of Warsaw's Old Town", "a city skyline", "an outdoor scene", "buildings in Europe". If you find yourself writing a location or theme instead of a subject — stop and name the actual subject.

STEP 2. Compare the primary subject from step 1 against "{item_name}". Set valid=true ONLY if they are the same specific thing. If they are different objects, different landmarks, different species, or different categories — valid is false, no exceptions.

STEP 3. Reasons that are NEVER enough to set valid=true:
 - The photo fits the collection's theme or area.
 - The subject is in the same city / country / neighborhood as the item.
 - The subject is the same type of thing (e.g. both are statues, both are churches).
 - The user clearly tried hard.
 - It "could be" or "looks similar" — that's valid=false.

STEP 4. confidence is your certainty about the verdict (positive OR negative). 0.95 means you'd bet money on it; 0.5 means it's a guess. Confident-no is a feature, not a flaw — a clearly-wrong photo gets valid=false with confidence ≥ 0.9.

STEP 5. suggestion is a short, kind, actionable hint that matches your verdict — never apologise for a positive verdict, never congratulate on a negative one.`;

const VALIDATE_PHOTO_TOOL = {
  name: 'validate_photo',
  description: 'Return the structured validation verdict for the submitted photo.',
  input_schema: {
    type: 'object',
    properties: {
      valid: { type: 'boolean', description: 'Whether the photo matches the claimed item.' },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Calibrated certainty between 0 and 1.',
      },
      detected: { type: 'string', description: 'What is actually visible in the photo.' },
      suggestion: { type: 'string', description: 'Short, helpful hint for the user.' },
    },
    required: ['valid', 'confidence', 'detected', 'suggestion'],
  },
} as const;

// Match-in-collection: pick which item from a known collection the photo
// matches best. Returns the verdict plus the chosen item id (or null) and a
// ranked top-3. confidence is the chosen item's confidence; "valid" means
// confidence is high enough to call it a match without user help.
const MATCH_ITEM_TOOL = {
  name: 'match_item',
  description:
    'Pick the item in the collection that best matches the photo. Return null if no item is a credible match.',
  input_schema: {
    type: 'object',
    properties: {
      matched_item_id: {
        type: ['string', 'null'],
        description: 'The id of the chosen item, or null if no candidate is a credible match.',
      },
      valid: {
        type: 'boolean',
        description:
          'Whether the chosen match is confident enough to commit without user confirmation.',
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      detected: { type: 'string' },
      suggestion: { type: 'string' },
      candidates: {
        type: 'array',
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
          required: ['id', 'confidence'],
        },
        description: 'Top-3 candidates with per-candidate confidence, in ranked order.',
      },
    },
    required: ['matched_item_id', 'valid', 'confidence', 'detected', 'suggestion', 'candidates'],
  },
} as const;

// Discover: pick which of the user's collections this photo most plausibly
// belongs to. Item resolution is a separate downstream pass — this step only
// disambiguates the collection.
const PICK_COLLECTION_TOOL = {
  name: 'pick_collection',
  description:
    'Pick the collection from the supplied list that this photo most plausibly belongs to, or null if none fits.',
  input_schema: {
    type: 'object',
    properties: {
      matched_collection_id: { type: ['string', 'null'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      detected: { type: 'string' },
      candidates: {
        type: 'array',
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
          required: ['id', 'confidence'],
        },
      },
    },
    required: ['matched_collection_id', 'confidence', 'detected', 'candidates'],
  },
} as const;

// Confidence threshold above which a match is auto-accepted (`valid=true`
// path on the client). Below this, the UI shows the candidates list and lets
// the user pick. Tuned to match the verify-mode bar — keep in sync with
// `valid=true only when the claimed item is clearly identifiable` in SYSTEM.
const MATCH_CONFIDENCE_THRESHOLD = 0.7;

interface ValidationResult {
  valid: boolean;
  confidence: number;
  detected: string;
  suggestion: string;
}

interface ApiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

interface FewShotExample {
  imageUrl: string;
  collectionDescription: string;
  itemName: string;
  expected: ValidationResult;
}

function buildFewShotExamples(): FewShotExample[] {
  const base = Deno.env.get('FEW_SHOT_FIXTURES_BASE_URL');
  if (!base) return [];
  return [
    {
      imageUrl: `${base}/cat.jpg`,
      collectionDescription: 'Photos of domestic cats in everyday surroundings.',
      itemName: 'Cat',
      expected: {
        valid: true,
        confidence: 0.95,
        detected: 'A domestic cat sitting on a wooden floor.',
        suggestion: 'Great shot — clearly a cat.',
      },
    },
    {
      imageUrl: `${base}/dog.jpg`,
      collectionDescription: 'Photos of domestic cats in everyday surroundings.',
      itemName: 'Cat',
      expected: {
        valid: false,
        confidence: 0.92,
        detected: 'A dog (looks like a Labrador) on a leash.',
        suggestion: 'This is a dog, not a cat — try again with a feline subject.',
      },
    },
    {
      imageUrl: `${base}/blurry.jpg`,
      collectionDescription: 'Photos of domestic cats in everyday surroundings.',
      itemName: 'Cat',
      expected: {
        valid: false,
        confidence: 0.3,
        detected: 'A blurry, motion-smeared shape; possibly an animal but not identifiable.',
        suggestion: 'Photo is too blurry — hold the camera still and try again.',
      },
    },
  ];
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

function imageBlock(url: string): unknown {
  return { type: 'image', source: { type: 'url', url } };
}

// Builds the messages array. Few-shot turns are static across calls (same
// fixture URLs, same hardcoded collection/item) so they belong in the cached
// prefix. We mark the LAST few-shot block with cache_control so tools+system+
// few-shot are cached together; the final user turn (varying photo + per-find
// context) stays uncached.
function buildMessages(
  photoUrl: string,
  collectionDescription: string,
  itemName: string
): unknown[] {
  const examples = buildFewShotExamples();
  const messages: unknown[] = [];

  examples.forEach((ex, i) => {
    const isLast = i === examples.length - 1;
    messages.push({
      role: 'user',
      content: [
        imageBlock(ex.imageUrl),
        {
          type: 'text',
          text: fillTemplate(USER_CONTEXT_TEMPLATE, {
            collection_description: ex.collectionDescription,
            item_name: ex.itemName,
          }),
        },
      ],
    });
    messages.push({
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: `example_${i}`,
          name: VALIDATE_PHOTO_TOOL.name,
          input: ex.expected,
        },
      ],
    });
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: `example_${i}`,
          content: 'ok',
          ...(isLast ? { cache_control: { type: 'ephemeral' } } : {}),
        },
      ],
    });
  });

  messages.push({
    role: 'user',
    content: [
      imageBlock(photoUrl),
      {
        type: 'text',
        text: fillTemplate(USER_CONTEXT_TEMPLATE, {
          collection_description: collectionDescription,
          item_name: itemName,
        }),
      },
    ],
  });

  return messages;
}

function parseToolUse(content: unknown): ValidationResult {
  if (!Array.isArray(content)) throw new Error('Unexpected response shape');
  const block = content.find((b: { type?: string }) => b?.type === 'tool_use');
  if (!block) throw new Error('No tool_use block in response');
  const input = (block as { input?: unknown }).input;
  if (!input || typeof input !== 'object') throw new Error('tool_use input missing');
  const r = input as Partial<ValidationResult>;
  if (
    typeof r.valid !== 'boolean' ||
    typeof r.confidence !== 'number' ||
    typeof r.detected !== 'string' ||
    typeof r.suggestion !== 'string'
  ) {
    throw new Error('tool_use input failed schema check');
  }
  return {
    valid: r.valid,
    confidence: Math.max(0, Math.min(1, r.confidence)),
    detected: r.detected,
    suggestion: r.suggestion,
  };
}

interface ValidationCall {
  result: ValidationResult;
  usage: ApiUsage;
}

export async function validateWithClaude(
  photoUrl: string,
  collectionDescription: string,
  itemName: string
): Promise<ValidationCall> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [VALIDATE_PHOTO_TOOL],
    tool_choice: { type: 'tool', name: VALIDATE_PHOTO_TOOL.name },
    system: [
      {
        type: 'text',
        text: SYSTEM_INSTRUCTIONS,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: buildMessages(photoUrl, collectionDescription, itemName),
  });
  const result = parseToolUse(message.content);
  const u = message.usage ?? {};
  const usage: ApiUsage = {
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
    cacheReadInputTokens: u.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: u.cache_creation_input_tokens ?? 0,
  };
  return { result, usage };
}

type Mode = 'verify' | 'match-in-collection' | 'discover';

interface RequestBody {
  photo_url?: string;
  mode?: Mode;
  collection_item_id?: string;
  collection_id?: string;
}

interface Candidate {
  id: string;
  name: string;
  confidence: number;
}

interface SuccessResponse {
  result: ValidationResult;
  mode: Mode;
  matched_collection_id: string | null;
  matched_item_id: string | null;
  candidate_items: Candidate[];
  candidate_collections: Candidate[];
  model: string;
  usage: ApiUsage;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Mode inference: explicit `mode` wins, otherwise infer from which IDs the
// caller supplied. Keeps the existing `{photo_url, collection_item_id}` body
// working without a `mode` field.
function inferMode(body: RequestBody): Mode {
  if (body.mode) return body.mode;
  if (body.collection_item_id) return 'verify';
  if (body.collection_id) return 'match-in-collection';
  return 'discover';
}

function addUsage(a: ApiUsage, b: ApiUsage): ApiUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadInputTokens: a.cacheReadInputTokens + b.cacheReadInputTokens,
    cacheCreationInputTokens: a.cacheCreationInputTokens + b.cacheCreationInputTokens,
  };
}

function readUsage(raw: unknown): ApiUsage {
  const u = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
  return {
    inputTokens: num(u.input_tokens),
    outputTokens: num(u.output_tokens),
    cacheReadInputTokens: num(u.cache_read_input_tokens),
    cacheCreationInputTokens: num(u.cache_creation_input_tokens),
  };
}

interface MatchItemToolInput {
  matched_item_id: string | null;
  valid: boolean;
  confidence: number;
  detected: string;
  suggestion: string;
  candidates: { id: string; confidence: number }[];
}

function parseMatchItemToolUse(content: unknown): MatchItemToolInput {
  if (!Array.isArray(content)) throw new Error('Unexpected response shape');
  const block = content.find((b: { type?: string }) => b?.type === 'tool_use');
  if (!block) throw new Error('No tool_use block in response');
  const input = (block as { input?: unknown }).input;
  if (!input || typeof input !== 'object') throw new Error('tool_use input missing');
  const r = input as Partial<MatchItemToolInput>;
  if (
    typeof r.valid !== 'boolean' ||
    typeof r.confidence !== 'number' ||
    typeof r.detected !== 'string' ||
    typeof r.suggestion !== 'string' ||
    !Array.isArray(r.candidates)
  ) {
    throw new Error('match_item tool input failed schema check');
  }
  return {
    matched_item_id: typeof r.matched_item_id === 'string' ? r.matched_item_id : null,
    valid: r.valid,
    confidence: Math.max(0, Math.min(1, r.confidence)),
    detected: r.detected,
    suggestion: r.suggestion,
    candidates: r.candidates
      .filter(
        (c): c is { id: string; confidence: number } =>
          !!c && typeof c.id === 'string' && typeof c.confidence === 'number'
      )
      .map((c) => ({ id: c.id, confidence: Math.max(0, Math.min(1, c.confidence)) }))
      .slice(0, 3),
  };
}

interface PickCollectionToolInput {
  matched_collection_id: string | null;
  confidence: number;
  detected: string;
  candidates: { id: string; confidence: number }[];
}

function parsePickCollectionToolUse(content: unknown): PickCollectionToolInput {
  if (!Array.isArray(content)) throw new Error('Unexpected response shape');
  const block = content.find((b: { type?: string }) => b?.type === 'tool_use');
  if (!block) throw new Error('No tool_use block in response');
  const input = (block as { input?: unknown }).input;
  if (!input || typeof input !== 'object') throw new Error('tool_use input missing');
  const r = input as Partial<PickCollectionToolInput>;
  if (
    typeof r.confidence !== 'number' ||
    typeof r.detected !== 'string' ||
    !Array.isArray(r.candidates)
  ) {
    throw new Error('pick_collection tool input failed schema check');
  }
  return {
    matched_collection_id:
      typeof r.matched_collection_id === 'string' ? r.matched_collection_id : null,
    confidence: Math.max(0, Math.min(1, r.confidence)),
    detected: r.detected,
    candidates: r.candidates
      .filter(
        (c): c is { id: string; confidence: number } =>
          !!c && typeof c.id === 'string' && typeof c.confidence === 'number'
      )
      .map((c) => ({ id: c.id, confidence: Math.max(0, Math.min(1, c.confidence)) }))
      .slice(0, 3),
  };
}

interface CollectionRow {
  id: string;
  title: string;
  description: string | null;
  ai_hint: string | null;
}

interface ItemRow {
  id: string;
  name: string;
  description: string | null;
  ai_validation_prompt: string | null;
}

async function listJoinedCollections(userId: string): Promise<CollectionRow[]> {
  // Owned + joined. Dedup just in case; users.creator collections aren't
  // necessarily mirrored in user_collections.
  const ownedRes = await supabase
    .from('collections')
    .select('id, title, description, ai_hint')
    .eq('creator_id', userId);
  if (ownedRes.error) throw ownedRes.error;

  const joinedRes = await supabase
    .from('user_collections')
    .select('collection:collections ( id, title, description, ai_hint )')
    .eq('user_id', userId);
  if (joinedRes.error) throw joinedRes.error;

  const owned = (ownedRes.data ?? []) as CollectionRow[];
  const joined = (joinedRes.data ?? [])
    .map((row: { collection: CollectionRow | null }) => row.collection)
    .filter((c: CollectionRow | null): c is CollectionRow => c !== null);

  const seen = new Set<string>();
  return [...owned, ...joined].filter((c: CollectionRow) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

async function listItemsForCollection(collectionId: string): Promise<ItemRow[]> {
  const { data, error } = await supabase
    .from('collection_items')
    .select('id, name, description, ai_validation_prompt')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ItemRow[];
}

async function pickItemWithClaude(
  photoUrl: string,
  collection: CollectionRow,
  items: ItemRow[]
): Promise<{ result: MatchItemToolInput; usage: ApiUsage }> {
  const itemsBlock = items
    .map(
      (it) =>
        `- id=${it.id} name="${it.name}" hint="${it.ai_validation_prompt ?? it.description ?? ''}"`
    )
    .join('\n');
  // The strictness guard is in the per-call user text (uncached) rather than
  // the system prompt (cached) so we can tune negativity without busting the
  // cache. Without it the model always picks the "closest" item out of
  // obligation and inflates confidence to 0.9+ even on unrelated photos —
  // tool schema requires `matched_item_id` and the model treats null as
  // exceptional unless explicitly told otherwise.
  const userText = `Collection: ${collection.title}
${collection.description ?? ''}

Items in this collection:
${itemsBlock}

Decision rules — read carefully:
1. If the photo does NOT credibly depict any of the items above, return matched_item_id=null with confidence below 0.4. Returning null is the CORRECT answer when nothing fits — do not pick the closest item out of obligation.
2. Set valid=true only when the photo clearly shows the chosen item. "Could be" or "looks similar" is valid=false.
3. confidence is your real certainty about the chosen match (or about the null verdict). 0.95 means you'd bet on it; 0.5 means it's a guess.
4. candidates: top-3 plausible item ids with their individual confidences, ranked. If nothing is plausible, return an empty array.
5. detected: describe what you actually see in the photo, not what you wish it was.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [MATCH_ITEM_TOOL],
    tool_choice: { type: 'tool', name: MATCH_ITEM_TOOL.name },
    system: [
      {
        type: 'text',
        text: SYSTEM_INSTRUCTIONS,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: photoUrl } },
          { type: 'text', text: userText },
        ],
      },
    ],
  });
  const result = parseMatchItemToolUse(message.content);
  return { result, usage: readUsage(message.usage) };
}

async function pickCollectionWithClaude(
  photoUrl: string,
  collections: CollectionRow[]
): Promise<{ result: PickCollectionToolInput; usage: ApiUsage }> {
  const block = collections
    .map(
      (c) =>
        `- id=${c.id} title="${c.title}" desc="${c.description ?? ''}" hint="${c.ai_hint ?? ''}"`
    )
    .join('\n');
  const userText = `User's collections:
${block}

Decision rules — read carefully:
1. If the photo does NOT credibly belong to ANY collection above, return matched_collection_id=null with confidence below 0.4. Returning null is the CORRECT answer when nothing fits.
2. confidence reflects how clearly the photo matches the chosen collection's theme (or how clearly nothing fits, for null).
3. candidates: top-3 plausible collection ids with their confidences, ranked. Empty array is fine if nothing is plausible.
4. detected: describe what you actually see in the photo.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [PICK_COLLECTION_TOOL],
    tool_choice: { type: 'tool', name: PICK_COLLECTION_TOOL.name },
    system: [
      {
        type: 'text',
        text: SYSTEM_INSTRUCTIONS,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: photoUrl } },
          { type: 'text', text: userText },
        ],
      },
    ],
  });
  const result = parsePickCollectionToolUse(message.content);
  return { result, usage: readUsage(message.usage) };
}

// Membership check used by match-in-collection: discover already routes
// through listJoinedCollections so the user can only see collections they
// own or joined. Without this gate, any authenticated caller could feed an
// arbitrary collection_id and read its item names back via candidate_items.
async function userCanAccessCollection(userId: string, collectionId: string): Promise<boolean> {
  const ownerRes = await supabase
    .from('collections')
    .select('id')
    .eq('id', collectionId)
    .eq('creator_id', userId)
    .maybeSingle();
  if (ownerRes.data) return true;

  const memberRes = await supabase
    .from('user_collections')
    .select('collection_id')
    .eq('user_id', userId)
    .eq('collection_id', collectionId)
    .maybeSingle();
  return !!memberRes.data;
}

async function handleMatchInCollection(
  userId: string,
  body: RequestBody
): Promise<{ ok: true; data: SuccessResponse } | { ok: false; status: number; error: unknown }> {
  const collectionId = body.collection_id;
  if (!collectionId) {
    return {
      ok: false,
      status: 400,
      error: { error: 'collection_id_required_for_match_in_collection' },
    };
  }

  if (!(await userCanAccessCollection(userId, collectionId))) {
    return { ok: false, status: 403, error: { error: 'forbidden' } };
  }

  const collectionRes = await supabase
    .from('collections')
    .select('id, title, description, ai_hint')
    .eq('id', collectionId)
    .single();
  if (collectionRes.error || !collectionRes.data) {
    return { ok: false, status: 404, error: { error: 'collection_not_found' } };
  }
  const collection = collectionRes.data as CollectionRow;
  const items = await listItemsForCollection(collectionId);
  if (items.length === 0) {
    return { ok: false, status: 422, error: { error: 'collection_has_no_items' } };
  }

  let pick: { result: MatchItemToolInput; usage: ApiUsage };
  try {
    pick = await pickItemWithClaude(body.photo_url!, collection, items);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 502, error: { error: 'vision_failed', detail } };
  }

  const itemById = new Map(items.map((it) => [it.id, it] as const));
  const candidate_items: Candidate[] = pick.result.candidates
    .map((c) => {
      const it = itemById.get(c.id);
      return it ? { id: it.id, name: it.name, confidence: c.confidence } : null;
    })
    .filter((c): c is Candidate => c !== null);

  // Validate the chosen id actually exists in the collection — guards
  // against the model hallucinating ids.
  const chosenId = pick.result.matched_item_id;
  const validatedId = chosenId && itemById.has(chosenId) ? chosenId : null;
  const valid =
    validatedId !== null &&
    pick.result.valid &&
    pick.result.confidence >= MATCH_CONFIDENCE_THRESHOLD;

  console.log(
    `[validate-find] mode=match-in-collection coll=${collectionId} chose=${validatedId ?? 'null'} ` +
      `confidence=${pick.result.confidence.toFixed(2)} candidates=${candidate_items.length}`
  );

  return {
    ok: true,
    data: {
      result: {
        valid,
        confidence: pick.result.confidence,
        detected: pick.result.detected,
        suggestion: pick.result.suggestion,
      },
      mode: 'match-in-collection',
      matched_collection_id: validatedId !== null ? collectionId : null,
      matched_item_id: validatedId,
      candidate_items,
      candidate_collections: [],
      model: MODEL,
      usage: pick.usage,
    },
  };
}

async function handleDiscover(
  userId: string,
  body: RequestBody
): Promise<{ ok: true; data: SuccessResponse } | { ok: false; status: number; error: unknown }> {
  const collections = await listJoinedCollections(userId);
  if (collections.length === 0) {
    return { ok: false, status: 422, error: { error: 'user_has_no_collections' } };
  }

  let pick: { result: PickCollectionToolInput; usage: ApiUsage };
  try {
    pick = await pickCollectionWithClaude(body.photo_url!, collections);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 502, error: { error: 'vision_failed', detail } };
  }

  const collectionById = new Map(collections.map((c) => [c.id, c] as const));
  const candidate_collections: Candidate[] = pick.result.candidates
    .map((c) => {
      const coll = collectionById.get(c.id);
      return coll ? { id: coll.id, name: coll.title, confidence: c.confidence } : null;
    })
    .filter((c): c is Candidate => c !== null);

  const chosenCollectionId = pick.result.matched_collection_id;
  const validCollectionId =
    chosenCollectionId && collectionById.has(chosenCollectionId) ? chosenCollectionId : null;

  if (!validCollectionId || pick.result.confidence < MATCH_CONFIDENCE_THRESHOLD) {
    // No confident collection — return the candidates so the client can ask
    // the user to pick. Item-level matching is skipped.
    console.log(
      `[validate-find] mode=discover no-collection-match confidence=${pick.result.confidence.toFixed(2)} candidates=${candidate_collections.length}`
    );
    return {
      ok: true,
      data: {
        result: {
          valid: false,
          confidence: pick.result.confidence,
          detected: pick.result.detected,
          suggestion: 'No matching collection found in your library.',
        },
        mode: 'discover',
        matched_collection_id: null,
        matched_item_id: null,
        candidate_items: [],
        candidate_collections,
        model: MODEL,
        usage: pick.usage,
      },
    };
  }

  // Confident collection picked; second pass picks the item inside it.
  const collection = collectionById.get(validCollectionId)!;
  const items = await listItemsForCollection(validCollectionId);
  if (items.length === 0) {
    // Edge case: AI picked a collection that has no items. Surface as a
    // discover result with the collection but no item — client offers
    // create-on-the-fly.
    return {
      ok: true,
      data: {
        result: {
          valid: false,
          confidence: pick.result.confidence,
          detected: pick.result.detected,
          suggestion: 'This collection has no items yet.',
        },
        mode: 'discover',
        matched_collection_id: validCollectionId,
        matched_item_id: null,
        candidate_items: [],
        candidate_collections,
        model: MODEL,
        usage: pick.usage,
      },
    };
  }

  let itemPick: { result: MatchItemToolInput; usage: ApiUsage };
  try {
    itemPick = await pickItemWithClaude(body.photo_url!, collection, items);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 502, error: { error: 'vision_failed', detail } };
  }

  const totalUsage = addUsage(pick.usage, itemPick.usage);
  const itemById = new Map(items.map((it) => [it.id, it] as const));
  const candidate_items: Candidate[] = itemPick.result.candidates
    .map((c) => {
      const it = itemById.get(c.id);
      return it ? { id: it.id, name: it.name, confidence: c.confidence } : null;
    })
    .filter((c): c is Candidate => c !== null);

  const chosenItemId = itemPick.result.matched_item_id;
  const validItemId = chosenItemId && itemById.has(chosenItemId) ? chosenItemId : null;
  const valid =
    validItemId !== null &&
    itemPick.result.valid &&
    itemPick.result.confidence >= MATCH_CONFIDENCE_THRESHOLD;

  console.log(
    `[validate-find] mode=discover coll=${validCollectionId} item=${validItemId ?? 'null'} ` +
      `coll_conf=${pick.result.confidence.toFixed(2)} item_conf=${itemPick.result.confidence.toFixed(2)}`
  );

  return {
    ok: true,
    data: {
      result: {
        valid,
        confidence: itemPick.result.confidence,
        detected: itemPick.result.detected,
        suggestion: itemPick.result.suggestion,
      },
      mode: 'discover',
      matched_collection_id: validCollectionId,
      matched_item_id: validItemId,
      candidate_items,
      candidate_collections,
      model: MODEL,
      usage: totalUsage,
    },
  };
}

async function handleVerify(
  body: RequestBody
): Promise<{ ok: true; data: SuccessResponse } | { ok: false; status: number; error: unknown }> {
  const collectionItemId = body.collection_item_id;
  if (!collectionItemId) {
    return {
      ok: false,
      status: 400,
      error: { error: 'collection_item_id_required_for_verify' },
    };
  }

  // Fetch only the metadata needed to render the prompt — the find row
  // doesn't exist yet, so we look up the collection_item directly.
  const { data: item, error: itemError } = await supabase
    .from('collection_items')
    .select(
      `
      name,
      description,
      ai_validation_prompt,
      collection_id,
      collections ( description )
    `
    )
    .eq('id', collectionItemId)
    .single();

  if (itemError || !item) {
    return { ok: false, status: 404, error: { error: 'collection_item_not_found' } };
  }

  const itemName = item.name as string | undefined;
  const collectionDescription =
    (item.collections?.description as string | undefined) ??
    (item.description as string | undefined) ??
    (item.ai_validation_prompt as string | undefined);

  if (!itemName || !collectionDescription) {
    return {
      ok: false,
      status: 422,
      error: { error: 'missing_collection_description_or_item_name' },
    };
  }

  let call: ValidationCall;
  try {
    call = await validateWithClaude(body.photo_url!, collectionDescription, itemName);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 502, error: { error: 'vision_failed', detail } };
  }

  const { result, usage } = call;
  const cacheHitRate =
    usage.cacheReadInputTokens + usage.cacheCreationInputTokens > 0
      ? usage.cacheReadInputTokens /
        (usage.cacheReadInputTokens + usage.cacheCreationInputTokens + usage.inputTokens)
      : 0;
  console.log(
    `[validate-find] mode=verify item=${collectionItemId} model=${MODEL} ` +
      `input=${usage.inputTokens} output=${usage.outputTokens} ` +
      `cache_read=${usage.cacheReadInputTokens} cache_write=${usage.cacheCreationInputTokens} ` +
      `cache_hit_rate=${cacheHitRate.toFixed(2)}`
  );

  // In verify mode the caller already chose the item; we echo it back when the
  // verdict is positive so the client treats this as a confident match without
  // a separate matching step. On a negative verdict we leave the matched ids
  // null — the client UI can then offer Retake / Save anyway.
  const matched = result.valid;
  return {
    ok: true,
    data: {
      result,
      mode: 'verify',
      matched_collection_id: matched ? ((item.collection_id as string | null) ?? null) : null,
      matched_item_id: matched ? collectionItemId : null,
      candidate_items: [],
      candidate_collections: [],
      model: MODEL,
      usage,
    },
  };
}

// Convert the camelCase ApiUsage we already track inside this function into
// the snake_case shape ai_calls expects. Kept inline so the rest of the code
// keeps its current naming and we don't churn the response payload.
function toAiCallsUsage(u: ApiUsage): AnthropicUsage {
  return {
    input_tokens: u.inputTokens,
    output_tokens: u.outputTokens,
    cache_read_tokens: u.cacheReadInputTokens,
    cache_creation_tokens: u.cacheCreationInputTokens,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Authenticate the caller — Vision calls cost real money. Without this,
  // any anonymous request can burn Anthropic budget on arbitrary photo URLs.
  // See .claude/rules/supabase.md → "Edge function caller auth".
  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return jsonResponse(auth.status, { error: auth.error });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  if (!body.photo_url) {
    return jsonResponse(400, { error: 'photo_url_required' });
  }

  const mode = inferMode(body);

  let out: { ok: true; data: SuccessResponse } | { ok: false; status: number; error: unknown };
  if (mode === 'verify') {
    out = await handleVerify(body);
  } else if (mode === 'match-in-collection') {
    out = await handleMatchInCollection(auth.userId, body);
  } else {
    // mode === 'discover' — auto-detect collection + item across the user's
    // joined collections.
    out = await handleDiscover(auth.userId, body);
  }

  if (out.ok) {
    // Log to ai_calls (normalized cost tracking). Best-effort — never let a
    // logging failure take down a successful Vision call. The client still
    // receives `usage` in the response so the existing finds.ai_* columns
    // stay populated until those readers migrate.
    await logAiCall(
      supabase,
      `validate-find:${mode}`,
      out.data.model,
      toAiCallsUsage(out.data.usage),
      {
        user_id: auth.userId,
        collection_id: out.data.matched_collection_id,
        collection_item_id: out.data.matched_item_id,
      }
    );
    return jsonResponse(200, out.data);
  }
  return jsonResponse(out.status, out.error);
});
