// Subagent: per-item image-search query rewriter.
//
// Long descriptive item names ("Tulip Field in Vibrant Colors", "Peony Bud
// Just Opening") confuse Wikipedia's token-overlap search — it ranks
// articles by word count match, so adjectives and atmospheric phrases pull
// in totally unrelated topics ("Colouring_pencils" matched on "Colors";
// "Pixel Buds" on "Buds"). We collapse each name into a tight 2–5-word
// search query so Wikipedia / Unsplash get a clean noun phrase plus any
// disambiguating context.
//
// Same locale-agnostic shape as the other subagents: takes a list of
// names, returns a name → query map. One call per collection, batches the
// whole list into a single tool-use turn.

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

import type { NormalizedUsage } from './types.ts';
import { normalizeUsage } from './types.ts';

const TOOL: Tool = {
  name: 'rewrite_search_queries',
  description:
    'Return a short image-search query for each item name, optimised for Wikipedia or Unsplash.',
  input_schema: {
    type: 'object',
    properties: {
      queries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            query: { type: 'string', minLength: 2, maxLength: 60 },
          },
          required: ['name', 'query'],
        },
      },
    },
    required: ['queries'],
  },
};

export interface ImageQueryResult {
  byName: Record<string, string>;
  usage: NormalizedUsage;
}

export async function runImageQueryRewriter(
  anthropic: Anthropic,
  model: string,
  collectionTitle: string,
  itemNames: string[]
): Promise<ImageQueryResult> {
  const userPrompt = `For each item name, write a SHORT search query (2-5 words) optimised for finding a representative photo on Wikipedia or Unsplash.

Collection context: ${collectionTitle}

Rules:
- Keep proper nouns intact (place names, species names, building names).
- Drop adjectives and atmospheric phrases ("vibrant", "morning light", "in full bloom", "just opening").
- Drop framing language ("panoramic view of", "interior of", "draped over a fence", "with sand surface").
- For geographic items, prefix with the city/country if it disambiguates ("Warsaw Old Town Market Square" not "Old Town Market Square").
- For ambiguous nouns, add a category disambiguator ("tulip flower" if just "Tulip" risks matching a band).
- Brevity beats poetry — the query is fed to a token-overlap search.

Items:
${itemNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Output via the rewrite_search_queries tool. Same order, one query per item.`;

  const message = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = (message.content as { type?: string }[]).find((b) => b?.type === 'tool_use');
  if (!block) throw new Error('image-query: no tool_use block');
  const input = (block as { input?: { queries?: { name?: string; query?: string }[] } }).input;
  const rows = input?.queries;
  if (!Array.isArray(rows)) throw new Error('image-query: invalid tool input');

  const byName: Record<string, string> = {};
  for (const r of rows) {
    if (typeof r.name === 'string' && typeof r.query === 'string') {
      byName[r.name.trim()] = r.query.trim();
    }
  }

  return { byName, usage: normalizeUsage(message.usage) };
}
