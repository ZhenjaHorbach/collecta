// Subagent: per-item rarity classification.
//
// Calibration target: roughly 60/30/10 across common/uncommon/rare for a
// well-balanced collection. We don't enforce that distribution — the
// coordinator's topic might be "rare cars" where everything is uncommon —
// we just hint at it in the prompt and let the model judge per-item.

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

import type { NormalizedUsage, Rarity, SubagentRarity } from './types.ts';
import { normalizeUsage } from './types.ts';

const TOOL: Tool = {
  name: 'classify_rarity',
  description: 'Classify each item by how often a city dweller would encounter it.',
  input_schema: {
    type: 'object',
    properties: {
      ratings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            rarity: { type: 'string', enum: ['common', 'uncommon', 'rare'] },
          },
          required: ['name', 'rarity'],
        },
      },
    },
    required: ['ratings'],
  },
};

export interface RarityResult {
  data: SubagentRarity;
  usage: NormalizedUsage;
}

export async function runRarity(
  anthropic: Anthropic,
  model: string,
  collectionTitle: string,
  itemNames: string[]
): Promise<RarityResult> {
  const userPrompt = `Classify each item by how often a typical city dweller would encounter it during normal life.

Collection: ${collectionTitle}

Scale:
- common: would see in a typical week (e.g. pigeon, latte, sedan)
- uncommon: spotted occasionally over a season (e.g. heron, kebab truck, vintage scooter)
- rare: takes intentional effort or luck (e.g. peregrine falcon, octopus dish, '57 Chevy)

Aim roughly for 60% common / 30% uncommon / 10% rare across the list — but adjust per item if the topic skews the distribution.

Items:
${itemNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Output only via the classify_rarity tool.`;

  const message = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = (message.content as { type?: string }[]).find((b) => b?.type === 'tool_use');
  if (!block) throw new Error('rarity: no tool_use block');
  const input = (block as { input?: { ratings?: { name?: string; rarity?: Rarity }[] } }).input;
  const rows = input?.ratings;
  if (!Array.isArray(rows)) throw new Error('rarity: invalid tool input');

  const byName: Record<string, Rarity> = {};
  for (const r of rows) {
    if (
      typeof r.name === 'string' &&
      (r.rarity === 'common' || r.rarity === 'uncommon' || r.rarity === 'rare')
    ) {
      byName[r.name.trim()] = r.rarity;
    }
  }

  return { data: { byName }, usage: normalizeUsage(message.usage) };
}
