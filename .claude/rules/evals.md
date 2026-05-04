# Evals

## Source of truth

All eval suites live in `src/evals/`. One file per suite, exporting a
`<suiteName>Cases: EvalCase[]`. Shared types in `src/evals/types.ts`. Currently:

| Suite                     | File                              | Triggers paid Claude calls? |
| ------------------------- | --------------------------------- | --------------------------- |
| `ai-validation`           | `ai-validation.eval.ts`           | yes — Vision per case       |
| `achievement-generator`   | `achievement-generator.eval.ts`   | yes — 1 memoised call/run   |
| `achievement-calibration` | `achievement-calibration.eval.ts` | yes — N runs (default 20)   |

## Two run paths — keep them in sync

Every suite is invokable two ways. **Adding or renaming a suite means updating both.**

1. **CLI / CI runner** — `scripts/run-evals.sh` → `src/evals/run.ts`. Reads suites from the `SUITES` map (`src/evals/run.ts:11`), writes a JSON report to `eval-results/`. Used by the GitHub workflows in `.claude/rules/ci.md`.
2. **Jest wrapper** — `src/evals/__tests__/<suite>.eval.test.ts`. Thin file that imports the cases and runs each as a `test(...)`. Skipped unless `RUN_EVALS=1` + `ANTHROPIC_API_KEY` are set. Mirrors the runner so `npm test` can exercise eval cases when explicitly opted in (e.g. local debugging, future merge gating). Co-located with the suite per project convention (`src/utils/__tests__/`, `supabase/functions/*/__tests__/`).

When you add `src/evals/foo.eval.ts`:

- Register it in `src/evals/run.ts` `SUITES`.
- Add `src/evals/__tests__/foo.eval.test.ts` mirroring the existing wrappers.
- Decide whether it has a CI workflow (`evals-vision.yml` style) or runs only on demand. Document it in `.claude/rules/ci.md`.

## EvalContext

`EvalCase.run` takes an `EvalContext` with `fixtureUrl` and `validate`. Only the vision suite uses them; achievement suites stub both with throwing functions in their Jest wrappers. **Do not narrow the context type per suite** — the runner treats all suites uniformly. If a new suite needs different deps, add fields to `EvalContext` (optional) rather than splitting the type.

## Cost gating

Eval cases hit paid APIs. The Jest wrapper pattern is:

```ts
const enabled = process.env.RUN_EVALS === '1' && Boolean(process.env.ANTHROPIC_API_KEY);
const describeFn = enabled ? describe : describe.skip;
```

For **expensive** suites (calibration: ~20+ Claude calls), require an additional flag:

```ts
const enabled =
  process.env.RUN_EVALS === '1' &&
  process.env.RUN_CALIBRATION === '1' &&
  Boolean(process.env.ANTHROPIC_API_KEY);
```

**Why:** `RUN_EVALS=1` is the entry point for cheap structural suites. A user toggling it must not accidentally trigger calibration's full bill.

Always include a placeholder `test('placeholder...', () => expect(true).toBe(true))` so Jest doesn't fail an empty suite when the gate is closed.

## Memoisation

Suites that share one expensive call across multiple assertions (e.g. `achievement-generator` runs the generator once and asserts shape from the same proposal — see `src/evals/achievement-generator.eval.ts:31`) must memoise at module scope, not call scope. The Jest wrapper and the CLI runner both create a fresh process per run, so cross-run leakage isn't a concern.

## Fixtures

`src/evals/fixtures/` holds vision fixtures only. They're served via `FEW_SHOT_FIXTURES_BASE_URL` (public Supabase Storage URL) — never inline base64. New fixtures: add the file, update `ai-validation.eval.ts`, and ensure the bucket is in sync.

Achievement suites have **no fixtures** — they exercise live model behaviour against the real catalog (`fetchExistingCatalog()`).

## Reports

`src/evals/report.ts` builds the `EvalReport` shape. CI uploads `eval-results/*.json` as a workflow artifact (30-day retention). Don't read these in app code — they're a CI artefact, not a runtime input.

## Don't

- Don't run evals from app code, hooks, or services. Eval files are dev-only.
- Don't add eval cases that mutate real DB state. Use a dedicated test user or a transaction that rolls back.
- Don't import `src/evals/*` from `src/` — keep the dependency one-way.
- Don't combine suites into "all evals" workflows — each suite has its own trigger contract (see `.claude/rules/ci.md`).
