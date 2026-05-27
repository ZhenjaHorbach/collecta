/**
 * Eval-side Claude client. Mirrors the edge-function tool-use schema, system
 * prompt, and prompt-cache layout so we test the *same* contract that
 * production uses. Keep this file in sync with
 * supabase/functions/validate-find/index.ts.
 */
import Anthropic from '@anthropic-ai/sdk';

import { ValidationResultSchema, type ValidationResult } from '@schemas';

const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_INSTRUCTIONS = `You are validating a photo for a collection app.
Use the validate_photo tool to respond. Be strict but fair:
- valid=true only when the claimed item is clearly identifiable.
- confidence reflects how certain you are (0=guess, 1=certain).
- detected describes what you actually see in the photo, not what the user claimed.
- suggestion is short, kind, actionable help for the user.`;

// Per-find context — uncached. Decision rules live here (not in the
// cached system prompt) so we can tune strictness without busting cache.
// Mirror of supabase/functions/validate-find/index.ts — keep in sync.
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

// Mirror of supabase/functions/validate-find/index.ts VALIDATE_PHOTO_TOOL.
// primary_subject + matches_claim drive a forced-reasoning chain so the
// model commits to a subject identification before deciding valid.
const VALIDATE_PHOTO_TOOL = {
  name: 'validate_photo',
  description:
    'Return the structured validation verdict for the submitted photo. Fill the fields in this order — primary_subject and matches_claim determine valid.',
  input_schema: {
    type: 'object' as const,
    properties: {
      primary_subject: { type: 'string' as const },
      matches_claim: { type: 'boolean' as const },
      valid: { type: 'boolean' as const },
      confidence: { type: 'number' as const, minimum: 0, maximum: 1 },
      detected: { type: 'string' as const },
      suggestion: { type: 'string' as const },
    },
    required: ['primary_subject', 'matches_claim', 'valid', 'confidence', 'detected', 'suggestion'],
  },
};

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export interface EvalUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface ValidateCall {
  result: ValidationResult;
  durationMs: number;
  usage: EvalUsage;
}

export async function callValidate(
  photoUrl: string,
  collectionDescription: string,
  itemName: string
): Promise<ValidateCall> {
  const startedAt = Date.now();
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
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: photoUrl } },
          {
            type: 'text',
            text: fillTemplate(USER_CONTEXT_TEMPLATE, {
              collection_description: collectionDescription,
              item_name: itemName,
            }),
          },
        ],
      },
    ],
  });

  const block = message.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new Error('No tool_use block in response');
  }
  const rawInput = block.input as Record<string, unknown>;
  // Safety-net matching supabase/functions/validate-find/index.ts: override
  // valid from matches_claim when the model contradicts itself.
  if (
    typeof rawInput.matches_claim === 'boolean' &&
    typeof rawInput.valid === 'boolean' &&
    rawInput.matches_claim !== rawInput.valid
  ) {
    rawInput.valid = rawInput.matches_claim;
  }
  const result = ValidationResultSchema.parse(rawInput);
  const u = message.usage;
  const usage: EvalUsage = {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadInputTokens: u.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: u.cache_creation_input_tokens ?? 0,
  };
  return { result, durationMs: Date.now() - startedAt, usage };
}
