---
name: vision-api
description: How Collecta calls Claude Vision for find validation — the single canonical prompt, tool-use schema, and fallback policy. Use when editing the validation prompt, adding new collections, or debugging odd verdicts.
---

# Claude Vision API — find validation

Collecta uses one path for AI photo validation: the `validate-find` Supabase edge function, which calls `anthropic.messages.create` with **forced tool use**. Eval-side code (`src/evals/client.ts`) mirrors this contract so the suite tests what production runs.

## Where the canonical prompt lives

- Production: `supabase/functions/validate-find/index.ts` → `VALIDATION_PROMPT` + `VALIDATE_PHOTO_TOOL`
- Evals: `src/evals/client.ts` → same constants, must stay in sync.

If you change one, change the other in the same commit. Drift between them silently breaks evals as a guard.

## The prompt

Template with two slots, filled per-find:

```
You are validating a photo for a collection app.
Collection: {collection_description}
Claimed item: {item_name}

Decide whether the photo shows the claimed item, well enough that this find belongs in the collection.
Use the validate_photo tool to respond. Be strict but fair:
- valid=true only when the claimed item is clearly identifiable.
- confidence reflects how certain you are (0=guess, 1=certain).
- detected describes what you actually see in the photo, not what the user claimed.
- suggestion is short, kind, actionable help for the user.
```

`{collection_description}` comes from `collection_items.collections.description` (preferred) or falls back to `collection_items.description`. `{item_name}` is `collection_items.name`. Edge function pulls both via one Supabase select.

## Tool-use schema (JSON enforcement)

```ts
tools: [{
  name: 'validate_photo',
  input_schema: {
    type: 'object',
    properties: {
      valid:      { type: 'boolean' },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      detected:   { type: 'string' },
      suggestion: { type: 'string' },
    },
    required: ['valid', 'confidence', 'detected', 'suggestion'],
  },
}],
tool_choice: { type: 'tool', name: 'validate_photo' },
```

Forcing `tool_choice` removes the "free-text vs tool_use" branch — the model **must** emit a tool_use block, and the schema validates input. We then re-validate with `ValidationResultSchema` (zod) on parse to catch any drift.

## Few-shot examples

Provided as multi-turn `user → assistant(tool_use) → user(tool_result: 'ok')` triplets in front of the real query. Three fixtures cover the canonical failure modes:

| Fixture      | Collection                 | Claimed item | Expected                             |
| ------------ | -------------------------- | ------------ | ------------------------------------ |
| `cat.jpg`    | "Photos of domestic cats…" | Cat          | valid=true, high confidence          |
| `dog.jpg`    | "Photos of domestic cats…" | Cat          | valid=false, high confidence (clear) |
| `blurry.jpg` | "Photos of domestic cats…" | Cat          | valid=false, low confidence (~0.3)   |

Fixtures are loaded **by URL**, not base64 — set `FEW_SHOT_FIXTURES_BASE_URL` env var to a public Supabase Storage bucket (`finds-photos/eval-fixtures` works). If the env var is absent, edge function falls back to zero-shot — still works, just less calibrated.

## Fallback policy (advisory, not blocking)

CLAUDE.md mandates "AI validation is advisory, not blocking." This is enforced at three layers:

1. **Find creation** is independent of validation. `createFind()` writes the row to Supabase before the edge function is ever called.
2. **Edge function**, on Vision error, writes `ai_validated: null` (not `false`) and returns HTTP 502 with `{ error: 'vision_failed' }`. The find is preserved.
3. **Client** (`useCapture` hook) treats `vision_failed` and `invoke_failed` separately from a real `valid: false` verdict — UI shows "couldn't verify" instead of "doesn't look right" and surfaces a "Save anyway" button regardless.

Never make UI block the find based on a `valid: false` verdict. The button label changes ("Save anyway" vs "Save") but the action stays available.

## Cost / latency budget

- Model: `claude-haiku-4-5-20251001`. Empirically beats Opus on our golden set:
  same accuracy (8/8), better confidence calibration on blurry inputs
  (Haiku ≈0.15 vs Opus ≈0.92), ~3× faster (p95 ~2.5s vs ~14s), ~10× cheaper.
  Re-evaluate this choice when the golden set grows in difficulty —
  classification on edge cases may justify going back to Opus.
- Few-shot adds ~3× input tokens; we accept that for calibration quality.
- Eval p95 budget: < 5000ms (case `latency_p95_under_5s`). Breaches mean either the model has regressed or fixtures got too large — investigate before raising the threshold.

## When to update this skill

- Changed the prompt? Update both `validate-find/index.ts` and `src/evals/client.ts`, then run evals (`npm run evals`) and confirm no regressions before merging.
- Added a new failure mode (e.g. low-light photos consistently mis-classified)? Add a fixture + eval case in `src/evals/ai-validation.eval.ts` so the next regression is caught.
- Considering switching off `tool_choice`? Don't — without it, format compliance drops and the parser becomes the bottleneck.
