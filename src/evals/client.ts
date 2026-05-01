/**
 * Eval-side Claude client. Mirrors the edge-function tool-use schema so we test
 * the *same* contract that production uses. Keep this file in sync with
 * supabase/functions/validate-find/index.ts.
 */
import Anthropic from '@anthropic-ai/sdk';

import { ValidationResultSchema, type ValidationResult } from '@schemas';

const MODEL = 'claude-haiku-4-5-20251001';

const VALIDATION_PROMPT = `You are validating a photo for a collection app.
Collection: {collection_description}
Claimed item: {item_name}

Decide whether the photo shows the claimed item, well enough that this find belongs in the collection.
Use the validate_photo tool to respond. Be strict but fair:
- valid=true only when the claimed item is clearly identifiable.
- confidence reflects how certain you are (0=guess, 1=certain).
- detected describes what you actually see in the photo, not what the user claimed.
- suggestion is short, kind, actionable help for the user.`;

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

function fillPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export interface ValidateCall {
  result: ValidationResult;
  durationMs: number;
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
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: photoUrl } },
          {
            type: 'text',
            text: fillPrompt(VALIDATION_PROMPT, {
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
  return { result, durationMs: Date.now() - startedAt };
}
