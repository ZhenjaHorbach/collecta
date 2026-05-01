// Edge Function: validate-find
// Called after a find is created. Fetches the photo, sends it to Claude Vision
// with a forced tool_use schema, and writes the result back to finds.
//
// Invoke: POST /functions/v1/validate-find
// Body: { find_id: string }

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

const VALIDATION_PROMPT = `You are validating a photo for a collection app.
Collection: {collection_description}
Claimed item: {item_name}

Decide whether the photo shows the claimed item, well enough that this find belongs in the collection.
Use the validate_photo tool to respond. Be strict but fair:
- valid=true only when the claimed item is clearly identifiable.
- confidence reflects how certain you are (0=guess, 1=certain).
- detected describes what you actually see in the photo, not what the user claimed.
- suggestion is short, kind, actionable help for the user (e.g. "get closer", "try better lighting").`;

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

function fillPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

function imageBlock(url: string): unknown {
  return { type: 'image', source: { type: 'url', url } };
}

function buildMessages(
  photoUrl: string,
  collectionDescription: string,
  itemName: string
): unknown[] {
  const examples = buildFewShotExamples();
  const messages: unknown[] = [];

  for (const ex of examples) {
    messages.push({
      role: 'user',
      content: [
        imageBlock(ex.imageUrl),
        {
          type: 'text',
          text: fillPrompt(VALIDATION_PROMPT, {
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
          id: `example_${examples.indexOf(ex)}`,
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
          tool_use_id: `example_${examples.indexOf(ex)}`,
          content: 'ok',
        },
      ],
    });
  }

  messages.push({
    role: 'user',
    content: [
      imageBlock(photoUrl),
      {
        type: 'text',
        text: fillPrompt(VALIDATION_PROMPT, {
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

export async function validateWithClaude(
  photoUrl: string,
  collectionDescription: string,
  itemName: string
): Promise<ValidationResult> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [VALIDATE_PHOTO_TOOL],
    tool_choice: { type: 'tool', name: VALIDATE_PHOTO_TOOL.name },
    messages: buildMessages(photoUrl, collectionDescription, itemName),
  });
  return parseToolUse(message.content);
}

interface RequestBody {
  find_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { find_id } = body;
  if (!find_id) {
    return new Response(JSON.stringify({ error: 'find_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: find, error: findError } = await supabase
    .from('finds')
    .select(
      `
      id,
      photo_url,
      collection_items (
        name,
        description,
        ai_validation_prompt,
        collections ( description )
      )
    `
    )
    .eq('id', find_id)
    .single();

  if (findError || !find) {
    return new Response(JSON.stringify({ error: 'Find not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const item = find.collection_items;
  const itemName = item?.name as string | undefined;
  const collectionDescription =
    (item?.collections?.description as string | undefined) ??
    (item?.description as string | undefined) ??
    (item?.ai_validation_prompt as string | undefined);

  if (!itemName || !collectionDescription) {
    return new Response(JSON.stringify({ error: 'Missing collection description or item name' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let result: ValidationResult | null = null;
  let visionError: string | null = null;
  try {
    result = await validateWithClaude(find.photo_url, collectionDescription, itemName);
  } catch (err) {
    visionError = err instanceof Error ? err.message : String(err);
  }

  // Advisory mode: never block the find. On Vision failure, leave ai_validated null
  // so the UI can show "couldn't verify, kept anyway".
  await supabase
    .from('finds')
    .update({
      ai_validated: result?.valid ?? null,
      ai_confidence: result?.confidence ?? null,
      ai_notes: result ? `${result.detected} — ${result.suggestion}` : visionError,
    })
    .eq('id', find_id)
    .throwOnError();

  if (!result) {
    return new Response(JSON.stringify({ error: 'vision_failed', detail: visionError }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
