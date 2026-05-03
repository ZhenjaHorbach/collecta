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

const USER_CONTEXT_TEMPLATE = `Collection: {collection_description}
Claimed item: {item_name}`;

const VALIDATE_PHOTO_TOOL = {
  name: 'validate_photo',
  description: 'Return the structured validation verdict for the submitted photo.',
  input_schema: {
    type: 'object' as const,
    properties: {
      valid: { type: 'boolean' as const },
      confidence: { type: 'number' as const, minimum: 0, maximum: 1 },
      detected: { type: 'string' as const },
      suggestion: { type: 'string' as const },
    },
    required: ['valid', 'confidence', 'detected', 'suggestion'],
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
  const result = ValidationResultSchema.parse(block.input);
  const u = message.usage;
  const usage: EvalUsage = {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadInputTokens: u.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: u.cache_creation_input_tokens ?? 0,
  };
  return { result, durationMs: Date.now() - startedAt, usage };
}
