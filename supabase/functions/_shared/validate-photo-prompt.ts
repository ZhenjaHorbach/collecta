// Single source for the validate-find photo-validation prompt, shared by the
// edge function (Deno) and the vision eval client (Node, src/evals/client.ts)
// so evals test exactly what production sends.
//
// MUST stay import-free and free of Deno globals: Node imports this file
// directly. Documented exception to the src <-> supabase/functions import ban
// in .claude/rules/testing.md. Fenced by
// __tests__/validate-photo-prompt.test.ts.
//
// Editing the prompt or tool schema changes production behaviour and busts
// the prompt cache — run the vision evals before merging
// (.claude/skills/vision-api/SKILL.md).

export const VALIDATION_MODEL = 'claude-haiku-4-5-20251001';

// Static instructions — frozen across all calls so they sit in the cached prefix.
// Per-find context (collection description, item name) is rendered into the
// final user turn instead, AFTER the breakpoint, so it stays out of the cache key.
export const SYSTEM_INSTRUCTIONS = `You are validating a photo for a collection app.
Use the validate_photo tool to respond. Be strict but fair:
- valid=true only when the claimed item is clearly identifiable.
- confidence reflects how certain you are (0=guess, 1=certain).
- detected describes what you actually see in the photo, not what the user claimed.
- suggestion is short, kind, actionable help for the user (e.g. "get closer", "try better lighting").`;

// Per-find context — uncached. The decision rules live here (not in the
// cached system prompt) so we can tune strictness without busting the
// cache. Without these rules the model treats "fits the collection theme"
// as enough: a Warsaw church passed as a Warsaw mermaid statue with 95%
// confidence because it correctly inferred the surrounding theme.
export const USER_CONTEXT_TEMPLATE = `Collection: {collection_description}
Claimed item: {item_name}

Decision rules — read carefully and apply in order:

STEP 1. Identify the PRIMARY SUBJECT of the photo — the thing that fills the most of the frame and is clearly what the photographer aimed at. Write this into "detected" as a concrete noun phrase. Examples of good "detected" values: "a Gothic red-brick church with two spires", "a bronze statue of a mermaid holding a sword", "a tabby cat sitting on a wooden floor". Examples of BAD "detected" values (vague, evasive, location-only): "a view of Warsaw's Old Town", "a city skyline", "an outdoor scene", "buildings in Europe". If you find yourself writing a location or theme instead of a subject — stop and name the actual subject.

STEP 2. Compare the primary subject from step 1 against "{item_name}". Set valid=true ONLY if they are the same specific thing. If they are different objects, different landmarks, different species, or different categories — valid is false, no exceptions.

STEP 3. Reasons that are NEVER enough to set valid=true:
 - The photo fits the collection's theme or area.
 - The subject is in the same city / country / neighborhood as the item.
 - The subject is the same type of thing (e.g. both are statues, both are churches).
 - The user clearly tried hard.
 - It "could be" or "looks similar" — that's valid=false.

STEP 4. confidence is your certainty about the verdict (positive OR negative). 0.95 means you'd bet money on it; 0.5 means it's a guess. Confident-no is a feature, not a flaw — a clearly-wrong photo gets valid=false with confidence ≥ 0.9.

STEP 5. suggestion is a short, kind, actionable hint that matches your verdict — never apologise for a positive verdict, never congratulate on a negative one.`;

// Schema is structured as a 3-step reasoning chain: model writes
// primary_subject (what's in the photo) → matches_claim (does it match the
// claimed item) → valid (must equal matches_claim). Splitting the comparison
// out catches model self-contradictions where it correctly identifies the
// subject but still flips valid=true out of obligation. parseToolUse
// overrides valid from matches_claim if they disagree.
// Not `as const` as a whole: the SDK's Tool type wants a mutable `required`
// array. Only `type: 'object'` needs the literal type.
export const VALIDATE_PHOTO_TOOL = {
  name: 'validate_photo',
  description:
    'Return the structured validation verdict for the submitted photo. Fill the fields in this order — primary_subject and matches_claim determine valid.',
  input_schema: {
    type: 'object' as const,
    properties: {
      primary_subject: {
        type: 'string',
        description:
          'The concrete primary subject of the photo, written as a noun phrase. Examples: "a Gothic red-brick church with two spires", "a bronze statue of a mermaid", "a tabby cat on a wooden floor". MUST be a specific subject — NOT a location or theme like "Warsaw Old Town", "city skyline", "outdoor scene".',
      },
      matches_claim: {
        type: 'boolean',
        description:
          'True iff primary_subject and the claimed item name the same specific thing. False when they are different objects, different landmarks, different species, or different categories — even if they share a theme, area, or category (e.g. "both are statues in Warsaw" is NOT a match).',
      },
      valid: {
        type: 'boolean',
        description:
          'MUST equal matches_claim. Setting valid=true while matches_claim=false is a contradiction and will be rejected.',
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description:
          'Your real certainty about the verdict (positive OR negative). 0.95 = you would bet on it; 0.5 = a guess. A clearly-wrong photo gets valid=false with confidence ≥ 0.9.',
      },
      detected: {
        type: 'string',
        description:
          'Same content as primary_subject — kept for backwards compat. A concrete noun phrase describing what is actually in the photo.',
      },
      suggestion: {
        type: 'string',
        description:
          'Short, kind, actionable hint that matches the verdict — never apologise for a positive verdict, never congratulate on a negative one.',
      },
    },
    required: ['primary_subject', 'matches_claim', 'valid', 'confidence', 'detected', 'suggestion'],
  },
};

// Renders {placeholders} in USER_CONTEXT_TEMPLATE. Unknown keys become ''.
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}
