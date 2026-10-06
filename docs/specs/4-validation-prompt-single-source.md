# 4. Validation prompt — single source for prod and evals

## Problem (verified, not hypothetical)

`src/evals/client.ts` hand-copies the validate-find prompt. The copies have
already drifted, so the vision evals do **not** test what production sends:

| Piece                   | Prod (`validate-find/index.ts`)                                                                                             | Eval copy (`src/evals/client.ts`) |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `SYSTEM_INSTRUCTIONS`   | last bullet ends `(e.g. "get closer", "try better lighting")`                                                               | example list missing              |
| `VALIDATE_PHOTO_TOOL`   | every field has a `description` — incl. "valid MUST equal matches_claim", "NOT a location or theme", confidence calibration | **no field descriptions at all**  |
| `USER_CONTEXT_TEMPLATE` | —                                                                                                                           | identical (for now)               |
| `MODEL`, `fillTemplate` | —                                                                                                                           | identical, duplicated             |

The tool field descriptions carry the core of the c225b22 fix, so an eval
pass on the copy says little about prod.

## Approach (option chosen by the owner)

- New pure module `supabase/functions/_shared/validate-photo-prompt.ts` —
  constants + one pure helper, **no imports**, no Deno globals:
  `VALIDATION_MODEL`, `SYSTEM_INSTRUCTIONS`, `USER_CONTEXT_TEMPLATE`,
  `VALIDATE_PHOTO_TOOL` (prod version, verbatim), `fillTemplate`.
- `validate-find/index.ts` imports it (`../_shared/validate-photo-prompt.ts`)
  and deletes its local copies. Prompt text is moved, not edited, so the
  production prompt and prompt-cache prefix are byte-identical.
- `src/evals/client.ts` imports the same module via a relative path and
  deletes its copies. Node can already load `_shared/` pure modules — Jest
  does it for `leveling.ts` and `anthropic-config.ts`.
- **Rule exception.** `.claude/rules/testing.md` forbids imports between
  `src/` and `supabase/functions/` in either direction. Documented
  exception: Node code (`src/evals`, tests) may import **pure, import-free**
  modules from `supabase/functions/_shared/`. The reverse direction stays
  banned (noting the existing `generate-collection → src/agents/` exception).

## Behaviour change for evals (intended)

Evals now send prod's tool schema with descriptions and prod's system text.
Results may shift; that's the point. Evals are not run in this change.

## Files I may change

- `supabase/functions/_shared/validate-photo-prompt.ts` (new)
- `supabase/functions/_shared/__tests__/validate-photo-prompt.test.ts` (new)
- `supabase/functions/validate-find/index.ts`
- `src/evals/client.ts`
- `.claude/rules/testing.md`, `.claude/skills/vision-api/SKILL.md`,
  `.claude/skills/evals/SKILL.md` (references to "keep in sync")

## Constraints

- Prompt text moved byte-for-byte. Prove it: hash of the prod strings before
  and after the move must match (done once during implementation).
- The override rule (`matches_claim` vs `valid`) stays where it is — item 5
  extracts it.
- No `deno` locally → edge code isn't type-checked. Run
  `deno check supabase/functions/validate-find/index.ts` before deploy.

## Acceptance checks

- `grep -n "SYSTEM_INSTRUCTIONS = \|VALIDATE_PHOTO_TOOL = " src supabase -r`
  → only the shared module defines them.
- Unit test: module is import-free (fence for the exception), tool requires
  the six fields, `fillTemplate` fills and blanks unknown keys.
- `npx tsc --noEmit` (now also type-checks the shared module through the
  eval import), `npx eslint . --max-warnings 0`, `npm test -- --ci`.

## Out of scope

- Few-shot examples: prod sends them (when `FEW_SHOT_FIXTURES_BASE_URL` is
  set), the eval client doesn't. Remaining difference — noted, not fixed.
- `match_item` / `pick_collection` prompts (no eval coverage today).
