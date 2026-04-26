import type { Database } from '@typings/database';

export type CollectionCategory = Database['public']['Enums']['collection_category'];

export const COLLECTION_CATEGORIES = [
  'nature',
  'urban',
  'animals',
  'food',
  'transport',
  'art',
  'sports',
  'visual',
  'seasonal',
  'travel',
] as const satisfies readonly CollectionCategory[];

export const CATEGORY_EMOJI: Record<CollectionCategory, string> = {
  nature: '🌿',
  urban: '🏙️',
  animals: '🐾',
  food: '🍜',
  transport: '🚆',
  art: '🎨',
  sports: '⚽',
  visual: '👁️',
  seasonal: '🍂',
  travel: '✈️',
};
