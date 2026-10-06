# 3. Warsaw church / mermaid regression eval case

## Goal

Pin the false positive fixed in `a2542c9` → `65d0adc` → `c225b22`: verify mode
returned `valid=true, confidence=0.95` for a photo of a Warsaw church claimed
as the Warsaw Mermaid statue. Today no eval covers it, so a prompt change
could silently bring it back.

## Approach

- New case `regression_warsaw_church_not_mermaid` in
  `src/evals/ai-validation.eval.ts`. Fixture `warsaw-church.jpg`, collection
  "Landmarks and monuments of Warsaw", item "Warsaw Mermaid statue".
  Passes only when `valid === false` **and** `matches_claim === false`.
- `matches_claim` is not part of `ValidationResult` (Zod strips it), so the
  eval client returns it alongside: `callValidate` → `matchesClaim`,
  `overridden` (true when the `matches_claim`/`valid` safety net fired).
  `EvalContext.validate` gets these as **optional** return fields, per
  `.claude/rules/evals.md` ("add optional fields, don't split the type").
- **Pending until the image is uploaded.** The fixture is not in git and not
  yet in the Storage bucket. The case declares
  `requiredFixtures: ['warsaw-church.jpg']`. A shared `runEvalCase(c, ctx)`
  (`src/evals/run-case.ts`) checks each required fixture with an HTTP `HEAD`
  (free, no model call) before running; if any is missing — or
  `FEW_SHOT_FIXTURES_BASE_URL` is unset — the result is
  `{ skipped: true, reason: 'pending: fixture … not available' }` and no
  Claude call is made.
- Both run paths use `runEvalCase`: CLI runner (`src/evals/run.ts`) and the
  Jest wrapper (`src/evals/__tests__/ai-validation.eval.test.ts`).
- `buildReport` excludes skipped cases from `total` / `accuracy` and reports
  a new `skipped` count, so a pending case doesn't drag accuracy down.

## Files I may change

- `src/evals/types.ts`, `src/evals/client.ts`, `src/evals/report.ts`,
  `src/evals/run.ts`, `src/evals/ai-validation.eval.ts`
- `src/evals/run-case.ts` (new), `src/evals/__tests__/run-case.test.ts` (new)
- `src/evals/__tests__/ai-validation.eval.test.ts`

## Constraints

- Do not run evals; `RUN_EVALS` stays unset. No paid calls.
- New unit tests use a fake `EvalContext` — no network.
- Other suites keep working: new context fields are optional.

## Acceptance checks

- Unit tests (always on, no network):
  - missing fixture → `skipped`, `validate` never called;
  - present fixture → case runs; `valid=false` + `matchesClaim=false`
    passes, `valid=true` fails, missing `matchesClaim` fails;
  - a throwing case becomes a failed (not skipped) result;
  - report excludes skipped cases from accuracy.
- `npx tsc --noEmit`, `npx eslint . --max-warnings 0`, `npm test -- --ci`.

## To activate (manual, later)

1. Add a ~200 KB JPEG of a Warsaw church (not the mermaid) as
   `src/evals/fixtures/warsaw-church.jpg` (Git LFS).
2. Upload it next to the other fixtures in Storage
   (`finds-photos/eval-fixtures/`, see `.claude/skills/evals/SKILL.md`).
3. Run the vision eval workflow. The case stops being skipped automatically.

## Out of scope

- Running the case. Sourcing / licensing the image.
- Cases for `match-in-collection` / `discover` modes (existing TODO).
