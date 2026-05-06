// Subagent: per-item AI validation hints.
//
// These strings drive validate-find — Claude Vision reads them when checking
// whether a user's photo matches the claimed item. ALWAYS English regardless
// of UI locale: validate-find's prompt and few-shot fixtures are
// English-tuned, and a stray Russian / Polish hint would shift verdicts in
// ways the eval suite doesn't cover.

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

import type { NormalizedUsage, SubagentValidationHints } from './types.ts';
import { normalizeUsage } from './types.ts';

const TOOL: Tool = {
  name: 'write_validation_hints',
  description: 'Return an English AI validation hint for each item.',
  input_schema: {
    type: 'object',
    properties: {
      hints: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            ai_hint: { type: 'string', minLength: 8, maxLength: 280 },
          },
          required: ['name', 'ai_hint'],
        },
      },
    },
    required: ['hints'],
  },
};

export interface ValidationHintsResult {
  data: SubagentValidationHints;
  usage: NormalizedUsage;
}

export async function runValidationHints(
  anthropic: Anthropic,
  model: string,
  collectionTitle: string,
  itemNames: string[]
): Promise<ValidationHintsResult> {
  const userPrompt = `You are writing AI validation hints for a photo-collection app.

Collection: ${collectionTitle}

For each item name, write ONE concise instruction (under 250 chars) IN ENGLISH telling a vision model what must be visible in the frame to count as a valid match. Focus on visible features only — no internal/structural details. Avoid hedging ("could be", "might"). Phrase as direct instructions.

Items:
${itemNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Return one entry per name in the same order. English only. Output only via the write_validation_hints tool.`;

  const message = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = (message.content as { type?: string }[]).find((b) => b?.type === 'tool_use');
  if (!block) throw new Error('validation-hints: no tool_use block');
  const input = (block as { input?: { hints?: { name?: string; ai_hint?: string }[] } }).input;
  const rows = input?.hints;
  if (!Array.isArray(rows)) throw new Error('validation-hints: invalid tool input');

  const byName: Record<string, string> = {};
  for (const r of rows) {
    if (typeof r.name === 'string' && typeof r.ai_hint === 'string') {
      byName[r.name.trim()] = r.ai_hint.trim();
    }
  }

  return { data: { byName }, usage: normalizeUsage(message.usage) };
}
