// Coordinator agent — owns the high-level structure of one collection.
// Output: title, description, category, and the item names. When the caller
// passes a category (cron path with topic-picker), we ask the model to echo
// it so we catch drift; when it's absent (edge function with free-form user
// prompt), the model picks the most appropriate one from the enum. Item
// details (description, ai_hint, rarity, fun_fact) are intentionally NOT
// requested here — they fan out to dedicated subagents in parallel so the
// per-item generation happens in three small turns instead of one giant one.

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

import type { CollectionCategory, CoordinatorPlan, Locale, NormalizedUsage } from './types.ts';
import { COLLECTION_CATEGORIES_TUPLE, normalizeUsage } from './types.ts';

const PLAN_TOOL: Tool = {
  name: 'plan_collection',
  description: 'Return the structured collection plan.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 3, maxLength: 80 },
      description: { type: 'string', minLength: 20, maxLength: 500 },
      category: {
        type: 'string',
        enum: [...COLLECTION_CATEGORIES_TUPLE],
      },
      item_names: {
        type: 'array',
        minItems: 5,
        maxItems: 25,
        items: { type: 'string', minLength: 2, maxLength: 80 },
      },
    },
    required: ['title', 'description', 'category', 'item_names'],
  },
};

const LANGUAGE_NAME: Record<Locale, string> = {
  en: 'English',
  ru: 'Russian',
  pl: 'Polish',
  uk: 'Ukrainian',
};

export interface CoordinatorInput {
  topic: string;
  category?: CollectionCategory;
  count: number;
  locale: Locale;
}

export interface CoordinatorResult {
  plan: CoordinatorPlan;
  usage: NormalizedUsage;
  model: string;
}

export async function runCoordinator(
  anthropic: Anthropic,
  model: string,
  input: CoordinatorInput
): Promise<CoordinatorResult> {
  const categoryRule = input.category
    ? `- Echo the category exactly — do not change it.`
    : `- Choose the most appropriate category from the enum based on the topic.`;
  const categoryLine = input.category ? `\nTarget category: ${input.category}` : '';
  const userPrompt = `Plan a real-world photo-collection.

Topic: ${input.topic}${categoryLine}
Target item count: ${input.count}
Title and description language: ${LANGUAGE_NAME[input.locale]}

Rules:
- Produce title and description in ${LANGUAGE_NAME[input.locale]}.
${categoryRule}
- item_names must list ${input.count} distinct, real items a person could plausibly photograph in everyday life.
- Names also in ${LANGUAGE_NAME[input.locale]}.
- Avoid duplicates, near-duplicates, and joke entries.
- Output via the plan_collection tool only.`;

  const message = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    tools: [PLAN_TOOL],
    tool_choice: { type: 'tool', name: PLAN_TOOL.name },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const content = message.content;
  if (!Array.isArray(content)) throw new Error('coordinator: unexpected response shape');
  const block = content.find((b: { type?: string }) => b?.type === 'tool_use');
  if (!block) throw new Error('coordinator: no tool_use block');
  const args = (block as { input?: unknown }).input;
  if (!args || typeof args !== 'object') throw new Error('coordinator: tool_use input missing');

  const r = args as Partial<{
    title: string;
    description: string;
    category: CollectionCategory;
    item_names: string[];
  }>;
  if (
    typeof r.title !== 'string' ||
    typeof r.description !== 'string' ||
    typeof r.category !== 'string' ||
    !Array.isArray(r.item_names)
  ) {
    throw new Error('coordinator: tool input failed schema check');
  }

  // De-dup and trim — the model occasionally adds blank entries despite the
  // schema. Cheaper to clean here than to re-prompt.
  const seen = new Set<string>();
  const itemNames = r.item_names
    .map((n) => (typeof n === 'string' ? n.trim() : ''))
    .filter((n) => {
      if (!n) return false;
      const key = n.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (itemNames.length < 5) {
    throw new Error(`coordinator: too few unique items (${itemNames.length})`);
  }

  return {
    plan: {
      title: r.title.trim(),
      description: r.description.trim(),
      category: r.category as CollectionCategory,
      itemNames,
    },
    usage: normalizeUsage(message.usage),
    model,
  };
}
