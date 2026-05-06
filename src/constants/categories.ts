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

// Per-category accent for icons / chips. These are *data* (one fixed colour
// per enum value), not theme tokens — the same value renders in light and
// dark, so they don't belong in palettes.ts. Hex literals here are the
// documented exception to the styling.md "no hex/rgba" rule; do not move
// them to inline className strings.
export const CATEGORY_COLOR: Record<CollectionCategory, string> = {
  nature: '#7CCBA6',
  urban: '#C4C4D0',
  animals: '#E9B86A',
  food: '#E89B6A',
  transport: '#6BA8D4',
  art: '#C4695A',
  sports: '#7AA66B',
  visual: '#8A6BA6',
  seasonal: '#D49A6B',
  travel: '#6BC4C4',
};
