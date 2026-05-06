// Shared types for the multi-agent collection generator.
// Kept narrow on purpose — each subagent works on plain string lists so the
// merge step can re-key results without per-agent shape gymnastics.
//
// Self-contained: no project-internal imports. This file is imported from
// both Node-side scripts (`scripts/generate-collection.ts`) and the Deno
// edge function (`supabase/functions/generate-collection`), so it must
// resolve cleanly under both runtimes. The `CollectionCategory` literal
// duplicates `src/constants/categories.ts`'s enum union — same 10 strings
// are also in the Postgres enum and the database.ts type. When you add a
// category, update all four spots together.

export type CollectionCategory =
  | 'nature'
  | 'urban'
  | 'animals'
  | 'food'
  | 'transport'
  | 'art'
  | 'sports'
  | 'visual'
  | 'seasonal'
  | 'travel';

export const COLLECTION_CATEGORIES_TUPLE: readonly CollectionCategory[] = [
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
] as const;

export type Locale = 'en' | 'ru' | 'pl' | 'uk';

export type Rarity = 'common' | 'uncommon' | 'rare';

export interface CoordinatorPlan {
  title: string;
  description: string;
  category: CollectionCategory;
  // Names only — descriptions, ai_hints, rarity get filled in by subagents.
  // Keeps the coordinator turn cheap and the per-item turns parallelisable.
  itemNames: string[];
}

export interface SubagentDescriptions {
  // Map name → short one-liner about what to look for. Same language as the
  // collection (driven by Locale).
  byName: Record<string, string>;
}

export interface SubagentValidationHints {
  // Map name → ai_hint, ALWAYS in English — validate-find consumes these
  // verbatim and is prompt-tuned for English regardless of UI locale.
  byName: Record<string, string>;
}

export interface SubagentRarity {
  byName: Record<string, Rarity>;
}

export interface SubagentFunFacts {
  byName: Record<string, string>;
}

export interface RawUsage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export interface NormalizedUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
}

export function normalizeUsage(raw: RawUsage | null | undefined): NormalizedUsage {
  const u = raw ?? {};
  return {
    input_tokens: u.input_tokens ?? 0,
    output_tokens: u.output_tokens ?? 0,
    cache_read_tokens: u.cache_read_input_tokens ?? 0,
    cache_creation_tokens: u.cache_creation_input_tokens ?? 0,
  };
}

export function sumUsage(...parts: NormalizedUsage[]): NormalizedUsage {
  return parts.reduce(
    (acc, p) => ({
      input_tokens: acc.input_tokens + p.input_tokens,
      output_tokens: acc.output_tokens + p.output_tokens,
      cache_read_tokens: acc.cache_read_tokens + p.cache_read_tokens,
      cache_creation_tokens: acc.cache_creation_tokens + p.cache_creation_tokens,
    }),
    { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0 }
  );
}
