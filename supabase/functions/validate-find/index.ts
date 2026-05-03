// Edge Function: validate-find
// Validates a photo against a collection item via Claude Vision and returns
// the structured verdict. **Does not** write to the finds table — the client
// creates the find row only after the user confirms Save, with the validation
// result baked in. This prevents orphan rows when the user retakes or
// discards.
//
// Invoke: POST /functions/v1/validate-find
// Body:   { photo_url: string, collection_item_id: string }
// Reply:  200 { result: ValidationResult, model: string, usage: ApiUsage }
//         404 { error: 'collection_item_not_found' }
//         422 { error: 'missing_collection_description_or_item_name' }
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

const USER_CONTEXT_TEMPLATE = `Collection: {collection_description}
Claimed item: {item_name}`;

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

interface RequestBody {
  photo_url: string;
  collection_item_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { photo_url, collection_item_id } = body;
  if (!photo_url || !collection_item_id) {
    return new Response(JSON.stringify({ error: 'photo_url_and_collection_item_id_required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
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
      collections ( description )
    `
    )
    .eq('id', collection_item_id)
    .single();

  if (itemError || !item) {
    return new Response(JSON.stringify({ error: 'collection_item_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const itemName = item.name as string | undefined;
  const collectionDescription =
    (item.collections?.description as string | undefined) ??
    (item.description as string | undefined) ??
    (item.ai_validation_prompt as string | undefined);

  if (!itemName || !collectionDescription) {
    return new Response(JSON.stringify({ error: 'missing_collection_description_or_item_name' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let call: ValidationCall;
  try {
    call = await validateWithClaude(photo_url, collectionDescription, itemName);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'vision_failed', detail }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { result, usage } = call;
  const cacheHitRate =
    usage.cacheReadInputTokens + usage.cacheCreationInputTokens > 0
      ? usage.cacheReadInputTokens /
        (usage.cacheReadInputTokens + usage.cacheCreationInputTokens + usage.inputTokens)
      : 0;
  console.log(
    `[validate-find] usage item=${collection_item_id} model=${MODEL} ` +
      `input=${usage.inputTokens} output=${usage.outputTokens} ` +
      `cache_read=${usage.cacheReadInputTokens} cache_write=${usage.cacheCreationInputTokens} ` +
      `cache_hit_rate=${cacheHitRate.toFixed(2)}`
  );

  return new Response(JSON.stringify({ result, model: MODEL, usage }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
