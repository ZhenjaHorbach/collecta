import { mergeAndValidate } from '../merge';
import type {
  CoordinatorPlan,
  SubagentDescriptions,
  SubagentFunFacts,
  SubagentRarity,
  SubagentValidationHints,
} from '../types';

const plan: CoordinatorPlan = {
  title: 'City pigeons',
  description: 'Common urban birds you can spot every day.',
  category: 'nature',
  itemNames: ['Sizar', 'Klintukh', 'Vyahir', 'Gorlitsa', 'Voronok'],
};

const descs: SubagentDescriptions = {
  byName: {
    Sizar: 'Look for grey-blue feathers near plazas.',
    Klintukh: 'Found in old parks with hollow trees.',
    Vyahir: 'A larger pigeon with a white neck patch.',
    Gorlitsa: 'Sandy-pink with black neck stripe.',
    Voronok: 'Glossy black with metallic sheen.',
  },
};

const hints: SubagentValidationHints = {
  byName: {
    Sizar: 'Photo must clearly show a feral rock pigeon.',
    Klintukh: 'Photo must clearly show a stock dove.',
    Vyahir: 'Photo must clearly show a wood pigeon.',
    Gorlitsa: 'Photo must clearly show a turtle dove.',
    Voronok: 'Photo must clearly show a hooded crow.',
  },
};

const rarity: SubagentRarity = {
  byName: {
    Sizar: 'common',
    Klintukh: 'uncommon',
    Vyahir: 'common',
    Gorlitsa: 'uncommon',
    Voronok: 'rare',
  },
};

const facts: SubagentFunFacts = {
  byName: {
    Sizar: 'Domesticated for thousands of years before going feral.',
    Klintukh: 'Nests in tree holes, unlike most pigeons.',
    Vyahir: 'Largest European pigeon by weight.',
    Gorlitsa: 'Migrates to sub-Saharan Africa each winter.',
    Voronok: 'Known to hide food and remember the spots.',
  },
};

describe('mergeAndValidate', () => {
  it('joins all four subagents on item names from the plan', () => {
    const merged = mergeAndValidate(plan, descs, hints, rarity, facts);
    expect(merged.title).toBe('City pigeons');
    expect(merged.category).toBe('nature');
    expect(merged.items).toHaveLength(5);
    const sizar = merged.items.find((i) => i.name === 'Sizar');
    expect(sizar).toEqual({
      name: 'Sizar',
      description: 'Look for grey-blue feathers near plazas.',
      ai_hint: 'Photo must clearly show a feral rock pigeon.',
      rarity: 'common',
      fun_fact: 'Domesticated for thousands of years before going feral.',
    });
  });

  it('falls back when a subagent omits an entry', () => {
    const partialDescs: SubagentDescriptions = {
      byName: { ...descs.byName },
    };
    delete partialDescs.byName.Vyahir;
    const merged = mergeAndValidate(plan, partialDescs, hints, rarity, facts);
    const v = merged.items.find((i) => i.name === 'Vyahir');
    expect(v?.description).toMatch(/find a/i);
  });

  it('throws when the coordinator plan is empty', () => {
    expect(() => mergeAndValidate({ ...plan, itemNames: [] }, descs, hints, rarity, facts)).toThrow(
      /zero items/
    );
  });
});
