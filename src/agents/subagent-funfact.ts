// Subagent: one fun fact per item. Show up in CreatorHints on the detail
// screen — purely flavour, zero functional impact. Same locale as the
// collection; capped short so the row stays readable.

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

import type { Locale, NormalizedUsage, SubagentFunFacts } from './types.ts';
import { extractToolUseRows, normalizeUsage } from './types.ts';

const TOOL: Tool = {
  name: 'write_fun_facts',
  description: 'Return a single short fun fact per item.',
  input_schema: {
    type: 'object',
    properties: {
      facts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            fun_fact: { type: 'string', minLength: 8, maxLength: 280 },
          },
          required: ['name', 'fun_fact'],
        },
      },
    },
    required: ['facts'],
  },
};

const LANGUAGE_NAME: Record<Locale, string> = {
  en: 'English',
  ru: 'Russian',
  pl: 'Polish',
  uk: 'Ukrainian',
};

export interface FunFactsResult {
  data: SubagentFunFacts;
  usage: NormalizedUsage;
}

export async function runFunFacts(
  anthropic: Anthropic,
  model: string,
  collectionTitle: string,
  itemNames: string[],
  locale: Locale
): Promise<FunFactsResult> {
  const userPrompt = `Collection: ${collectionTitle}

For each item, write ONE short, surprising-but-true fact (under 200 chars) in ${LANGUAGE_NAME[locale]}. No filler ("Did you know"), no marketing tone, no fabrication. If you don't have a confident fact, give a precise descriptive note instead.

Items:
${itemNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Output only via the write_fun_facts tool.`;

  const message = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const rows = extractToolUseRows<{ name?: string; fun_fact?: string }>(
    message,
    'facts',
    'fun-facts'
  );

  const byName: Record<string, string> = {};
  for (const r of rows) {
    if (typeof r.name === 'string' && typeof r.fun_fact === 'string') {
      byName[r.name.trim()] = r.fun_fact.trim();
    }
  }

  return { data: { byName }, usage: normalizeUsage(message.usage) };
}
