# 5. Unit tests for validate-find parsing + override rule

## Goal

Edge-function handlers have no unit tests. The most safety-critical pure
piece of `validate-find` is `parseToolUse`: it validates the model's tool
output, clamps confidence, and applies the c225b22 safety net (when
`matches_claim` and `valid` disagree, `matches_claim` wins). Today it can't
be tested (it lives inside a Deno entrypoint with module-level clients), and
the eval client re-implements the override rule by hand.

## Approach

- New pure module `supabase/functions/_shared/validate-photo-parse.ts`
  (import-free, no Deno globals — same exception as item 4):
  - `resolveVerdict(valid, matchesClaim)` → `{ valid, overridden }` — the
    override rule alone.
  - `parseValidatePhotoToolUse(content)` →
    `{ result: { valid, confidence, detected, suggestion }, matchesClaim,
overridden }`. Same checks, same error messages as today. No logging —
    returns `overridden` so the caller decides.
- `validate-find/index.ts`: `parseToolUse` deleted; `validateWithClaude`
  calls the shared parser and keeps the existing `console.warn` when
  `overridden`. Behaviour and log text unchanged.
- `src/evals/client.ts`: drops its hand-written override; uses the shared
  parser, then `ValidationResultSchema.parse` as before. Side effect: evals
  now also clamp confidence exactly like prod.
- `supabase/functions/_shared/__tests__/tsconfig.json`: add `"node"` to
  `types` — the item-4 fence test uses `node:fs` / `__dirname`, and the IDE
  flagged missing Node types there (Jest itself ran fine).

## Tests (`_shared/__tests__/validate-photo-parse.test.ts`, no network)

- well-formed agreeing output → passes through, `overridden=false`;
- church case: `matches_claim=false, valid=true` → `valid=false`,
  `overridden=true`; and the reverse disagreement;
- `matches_claim` missing → no override (legacy outputs);
- confidence clamped to [0, 1];
- malformed: non-array content, no `tool_use` block, missing input,
  wrong field types → throw with today's messages (they surface as
  `vision_failed` detail).

## Files I may change

- `supabase/functions/_shared/validate-photo-parse.ts` (new) + test (new)
- `supabase/functions/_shared/__tests__/tsconfig.json`
- `supabase/functions/validate-find/index.ts`, `src/evals/client.ts`
- `.claude/rules/testing.md` (list the second exception module)

## Out of scope

- `parseMatchItemToolUse` / `parsePickCollectionToolUse` (same pattern,
  next candidates).
- Handler-level tests (need Deno + mocked Supabase/Anthropic).

## Checks

`npx tsc --noEmit`, `npx eslint . --max-warnings 0`, `npm test -- --ci`.
Edge entrypoint still needs `deno check` (not installed locally).
