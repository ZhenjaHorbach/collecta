// Subagent: per-item description.
//
// Takes the names from the coordinator plan and returns one short
// "what to look for" sentence per name, in the user-facing locale. These
// strings show up on collection cards and the detail screen, so they need to
// read naturally — but they're advisory, not validation criteria. The
// validation hint is the validation subagent's job.

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

import type { Locale, NormalizedUsage, SubagentDescriptions } from './types.ts';
import { extractToolUseRows, normalizeUsage } from './types.ts';

const TOOL: Tool = {
  name: 'write_descriptions',
  description: 'Return a short user-facing description for each item.',
  input_schema: {
    type: 'object',
    properties: {
      descriptions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string', minLength: 6, maxLength: 280 },
          },
          required: ['name', 'description'],
        },
      },
    },
    required: ['descriptions'],
  },
};

const LANGUAGE_NAME: Record<Locale, string> = {
  en: 'English',
  ru: 'Russian',
  pl: 'Polish',
  uk: 'Ukrainian',
};

export interface DescriptionsResult {
  data: SubagentDescriptions;
  usage: NormalizedUsage;
}

export async function runDescriptions(
  anthropic: Anthropic,
  model: string,
  collectionTitle: string,
  itemNames: string[],
  locale: Locale
): Promise<DescriptionsResult> {
  const userPrompt = `Collection: ${collectionTitle}

For each item name below, write ONE short sentence (under 200 chars) in ${LANGUAGE_NAME[locale]} describing what someone should look for in real life when trying to photograph it. Friendly, concrete, no marketing speak.

Items:
${itemNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Return one entry per name in the same order. Output only via the write_descriptions tool.`;

  const message = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const rows = extractToolUseRows<{ name?: string; description?: string }>(
    message,
    'descriptions',
    'descriptions'
  );

  const byName: Record<string, string> = {};
  for (const r of rows) {
    if (typeof r.name === 'string' && typeof r.description === 'string') {
      byName[r.name.trim()] = r.description.trim();
    }
  }

  return { data: { byName }, usage: normalizeUsage(message.usage) };
}
