// Structural evals for the weekly collection generator. Run on every PR
// that touches the prompt or the script (paths-filtered in
// .github/workflows/evals-collection.yml).
//
// Goal: catch prompt regressions where the topic picker proposes a
// duplicate, the coordinator emits the wrong category, items collide on
// name, ai_hints leak non-English content, or the rarity field falls
// outside the allowlist.
//
// Calibration (per-run cost, dup rate across many runs, category variety,
// self-grade) lives in collection-calibration.eval.ts and is only run on
// workflow_dispatch.

import {
  fetchExistingCatalog,
  generateCollection,
  validateTopicAgainstCatalog,
  type GenerateResult,
} from '../../scripts/generate-collection';
import { COLLECTION_CATEGORIES } from '@constants/categories';

import type { EvalCase, EvalCaseResult } from './types';

const CATEGORIES = new Set<string>(COLLECTION_CATEGORIES);
const RARITIES = new Set<string>(['common', 'uncommon', 'rare']);

// Cyrillic / Greek / extended Latin diacritics in an ai_hint usually mean
// the validation subagent leaked the user-facing locale into a field that's
// supposed to stay English (validate-find is English-tuned). This isn't a
// hard ban — proper nouns slip through ("Café") — so the assertion looks
// for a heavy ratio, not a single character.
const NON_ENGLISH_RE = /[Ѐ-ӿͰ-ϿÀ-ſ]/;

interface RunOnce {
  result: GenerateResult | null;
  reason?: string;
  durationMs: number;
}

let memoised: Promise<RunOnce> | null = null;
function runGeneratorOnce(): Promise<RunOnce> {
  if (memoised) return memoised;
  memoised = (async () => {
    const startedAt = Date.now();
    try {
      const result = await generateCollection();
      return { result, durationMs: Date.now() - startedAt };
    } catch (err) {
      return {
        result: null,
        reason: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startedAt,
      };
    }
  })();
  return memoised;
}

function caseFromAssertion(
  name: string,
  assertion: (r: GenerateResult) => string | null
): EvalCase {
  return {
    name,
    async run(): Promise<EvalCaseResult> {
      const r = await runGeneratorOnce();
      if (!r.result) {
        return { name, passed: false, parsed: false, durationMs: r.durationMs, reason: r.reason };
      }
      const failure = assertion(r.result);
      return {
        name,
        passed: failure === null,
        parsed: true,
        durationMs: r.durationMs,
        reason: failure ?? undefined,
        meta: {
          title: r.result.collection.title,
          category: r.result.collection.category,
          itemCount: r.result.collection.items.length,
          topic: r.result.topic.topic,
        },
      };
    },
  };
}

const formatCompliance = caseFromAssertion('format_compliance', () => null);

const categoryAllowlist = caseFromAssertion('category_allowlist', (r) =>
  CATEGORIES.has(r.collection.category)
    ? null
    : `category="${r.collection.category}" not in allowlist`
);

// Topic and coordinator both emit a category; if they disagree the SQL
// migration writes the coordinator's value, which can drift from what the
// picker rationalised about. Catch that drift.
const categoryConsistency = caseFromAssertion('category_consistency', (r) =>
  r.collection.category === r.topic.category
    ? null
    : `topic.category=${r.topic.category} but collection.category=${r.collection.category}`
);

const titleLength = caseFromAssertion('title_length', (r) => {
  const len = r.collection.title.length;
  return len >= 3 && len <= 80 ? null : `title length=${len} outside 3–80`;
});

const descriptionLength = caseFromAssertion('description_length', (r) => {
  const len = r.collection.description.length;
  return len >= 20 && len <= 1000 ? null : `description length=${len} outside 20–1000`;
});

const itemCountInRange = caseFromAssertion('item_count_in_range', (r) => {
  const n = r.collection.items.length;
  return n >= 10 && n <= 25 ? null : `item count=${n} outside 10–25`;
});

// Coordinator should not emit two items with the same (lowercased) name —
// the partial unique index on collections survives, but downstream the
// camera UX shows two indistinguishable cells.
const noDuplicateItemNames = caseFromAssertion('no_duplicate_item_names', (r) => {
  const seen = new Set<string>();
  for (const item of r.collection.items) {
    const key = item.name.trim().toLowerCase();
    if (seen.has(key)) return `duplicate item name: "${item.name}"`;
    seen.add(key);
  }
  return null;
});

const allItemsHaveDescription = caseFromAssertion('all_items_have_description', (r) => {
  const empty = r.collection.items.find((i) => !i.description.trim());
  return empty ? `item "${empty.name}" has empty description` : null;
});

const allItemsHaveAiHint = caseFromAssertion('all_items_have_ai_hint', (r) => {
  const empty = r.collection.items.find((i) => !i.ai_hint.trim());
  return empty ? `item "${empty.name}" has empty ai_hint` : null;
});

const aiHintsAreEnglish = caseFromAssertion('ai_hints_are_english', (r) => {
  const leaked = r.collection.items.filter((i) => NON_ENGLISH_RE.test(i.ai_hint));
  if (leaked.length === 0) return null;
  // Allow up to 1 stray (proper nouns, café, etc.) before flagging.
  if (leaked.length === 1) return null;
  return `${leaked.length} items have non-English ai_hint (expected EN-only): ${leaked
    .slice(0, 3)
    .map((i) => i.name)
    .join(', ')}`;
});

const rarityAllowlist = caseFromAssertion('rarity_allowlist', (r) => {
  const bad = r.collection.items.find((i) => !RARITIES.has(i.rarity));
  return bad ? `item "${bad.name}" has rarity="${bad.rarity}" not in allowlist` : null;
});

// At least two distinct rarity values across the collection — if every item
// is "common" the visual grading on Discover/Detail loses meaning.
const rarityDiversity = caseFromAssertion('rarity_has_two_levels', (r) => {
  const set = new Set(r.collection.items.map((i) => i.rarity));
  return set.size >= 2 ? null : `only one rarity used: ${[...set].join(',')}`;
});

// Catalog cross-check: dedup vs live data. Reuses the same validator the
// production script runs, so this case fails for the exact reasons the
// script would refuse to write a migration.
const noCatalogCollision: EvalCase = {
  name: 'no_catalog_collision',
  async run(): Promise<EvalCaseResult> {
    const r = await runGeneratorOnce();
    if (!r.result) {
      return {
        name: this.name,
        passed: false,
        parsed: false,
        durationMs: r.durationMs,
        reason: r.reason,
      };
    }
    try {
      const existing = await fetchExistingCatalog();
      validateTopicAgainstCatalog(r.result.topic, existing);
      return { name: this.name, passed: true, parsed: true, durationMs: r.durationMs };
    } catch (err) {
      return {
        name: this.name,
        passed: false,
        parsed: true,
        durationMs: r.durationMs,
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

export const collectionGeneratorCases: EvalCase[] = [
  formatCompliance,
  categoryAllowlist,
  categoryConsistency,
  titleLength,
  descriptionLength,
  itemCountInRange,
  noDuplicateItemNames,
  allItemsHaveDescription,
  allItemsHaveAiHint,
  aiHintsAreEnglish,
  rarityAllowlist,
  rarityDiversity,
  noCatalogCollision,
];
