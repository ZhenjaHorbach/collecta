/**
 * Eval-side Claude client. Prompt, tool schema and model come from the same
 * module the validate-find edge function uses
 * (supabase/functions/_shared/validate-photo-prompt.ts), so evals test the
 * exact production prompt. Only the transport differs: this calls Anthropic
 * directly instead of going through the edge function, and sends no
 * few-shot examples.
 */
import Anthropic from '@anthropic-ai/sdk';

import { ValidationResultSchema, type ValidationResult } from '@schemas';

import {
  fillTemplate,
  SYSTEM_INSTRUCTIONS,
  USER_CONTEXT_TEMPLATE,
  VALIDATE_PHOTO_TOOL,
  VALIDATION_MODEL,
} from '../../supabase/functions/_shared/validate-photo-prompt';
import { parseValidatePhotoToolUse } from '../../supabase/functions/_shared/validate-photo-parse';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  // Raw tool fields stripped by ValidationResultSchema — regression cases
  // assert on them (e.g. matches_claim=false for the Warsaw church).
  matchesClaim?: boolean;
  overridden: boolean;
}

export async function callValidate(
  photoUrl: string,
  collectionDescription: string,
  itemName: string
): Promise<ValidateCall> {
  const startedAt = Date.now();
  const message = await anthropic.messages.create({
    model: VALIDATION_MODEL,
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

  // Same parser as prod: shape check, confidence clamp, matches_claim
  // safety net. Zod then enforces the client-facing ValidationResult shape.
  const parsed = parseValidatePhotoToolUse(message.content);
  const { matchesClaim, overridden } = parsed;
  const result = ValidationResultSchema.parse(parsed.result);
  const u = message.usage;
  const usage: EvalUsage = {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadInputTokens: u.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: u.cache_creation_input_tokens ?? 0,
  };
  return { result, durationMs: Date.now() - startedAt, usage, matchesClaim, overridden };
}
