// Merge step (the "hub" in hub-and-spoke). Takes the coordinator plan plus
// the four subagent outputs and produces the final shape the seeder writes
// to Supabase. Any name the coordinator emitted that's missing from a
// subagent gets a sensible fallback so a single agent failure doesn't
// blackhole the whole collection — the seeder still writes the row.

import type {
  CoordinatorPlan,
  SubagentDescriptions,
  SubagentFunFacts,
  SubagentRarity,
  SubagentValidationHints,
} from './types.ts';

export interface MergedItem {
  name: string;
  description: string;
  ai_hint: string;
  rarity: 'common' | 'uncommon' | 'rare';
  fun_fact: string;
  example_image_url?: string | null;
}

export interface MergedCollection {
  title: string;
  description: string;
  category: CoordinatorPlan['category'];
  items: MergedItem[];
}

export function mergeAndValidate(
  plan: CoordinatorPlan,
  descs: SubagentDescriptions,
  hints: SubagentValidationHints,
  rarity: SubagentRarity,
  facts: SubagentFunFacts,
  images?: Record<string, string | null>
): MergedCollection {
  if (plan.itemNames.length === 0) {
    throw new Error('merge: coordinator returned zero items');
  }

  const items: MergedItem[] = plan.itemNames.map((name) => ({
    name,
    description: descs.byName[name] ?? `Find a ${name.toLowerCase()}.`,
    ai_hint: hints.byName[name] ?? `Photo must clearly show: ${name}.`,
    rarity: rarity.byName[name] ?? 'common',
    fun_fact: facts.byName[name] ?? '',
    example_image_url: images ? (images[name] ?? null) : undefined,
  }));

  // Drop entries that ended up with empty mandatory fields after fallback —
  // shouldn't happen with the defaults above, but guards against future
  // refactors that change the fallback shape.
  const valid = items.filter((it) => it.name && it.description && it.ai_hint);
  if (valid.length < 5) {
    throw new Error(`merge: too few valid items after merge (${valid.length})`);
  }

  return {
    title: plan.title,
    description: plan.description,
    category: plan.category,
    items: valid,
  };
}
