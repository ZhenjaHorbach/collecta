---
name: evals
description: How Collecta tests AI components — golden-set policy, calibration vs accuracy, when to add a fixture, how to read the report. Use when adding/changing eval cases, debugging flaky cases, or interpreting CI reports.
---

# AI evals — methodology

Eval suite lives at `src/evals/` and tests the same Claude Vision contract that production runs. Never mock the Anthropic API in evals — we want to catch real regressions in model output, not in our wrappers.

## Where things live

```
src/evals/
  run.ts                  # CLI entrypoint — npm run evals
  client.ts               # Anthropic SDK wrapper, mirrors edge function exactly
  ai-validation.eval.ts   # 8 cases for find validation
  report.ts               # accuracy / latency / format-compliance aggregation
  types.ts                # EvalCase, EvalReport interfaces
  fixtures/               # golden-set photos (Git LFS)
__tests__/evals/          # jest-discoverable thin wrappers (skipped unless RUN_EVALS=1)
scripts/run-evals.ts      # alias entrypoint, re-exports src/evals/run
```

## Two distinct things we measure

**Accuracy** — does the model give the _right answer_? E.g. cat in cats collection ⇒ `valid=true`. This is what `passed/total` captures.

**Calibration** — is the model's _confidence_ believable? A blurry photo should produce `confidence < 0.5` _even if_ it gets `valid` right. Use this signal to detect when the model is overconfident on garbage input.

Both matter, both need their own cases. Don't conflate them: `confidence_calibration_blurry` deliberately doesn't check `valid` — only confidence.

## Golden-set policy

Add a fixture when:

- A real user-reported false positive / false negative reproduces consistently.
- A new collection type ships with a meaningfully different visual signature (e.g. street art vs mosaics — visually distinct enough to break shared assumptions).
- A model upgrade looks like it might have regressed — capture pre/post examples.

Don't add a fixture when:

- It's an edge case nobody has hit and we're guessing.
- It only tests our wrapper code (zod parse, env-var handling) — that belongs in unit tests.
- The case is flaky on the same input — investigate why, don't paper over it.

Each fixture: ~200KB JPEG (resize before committing — they're in Git LFS but bandwidth still matters). Filename = the concept (`cat.jpg`, `dog.jpg`, `blurry.jpg`, `building.jpg`, `sky.jpg`). Upload to Supabase Storage `finds-photos/eval-fixtures/` so both edge function and eval runner can fetch by URL.

## Flaky vs real regression

If a case fails once but passes on rerun:

1. **Latency only** — networks vary, p95 fluctuates. Run 3×; if p95 stays under budget median → not flaky, just a tail event.
2. **Verdict flips** — model is genuinely on the boundary for this fixture. Either tighten the prompt (better calibration), or replace the fixture with a less ambiguous one. Don't widen the assertion to make the test pass.
3. **Parse failure** — schema regression. Check that `tool_choice: { type: 'tool', name: ... }` is still set; without it, model may emit free text.

Three runs is usually enough to tell flake from regression. If a case has flipped twice in a row, it's a regression.

## Latency case specifics

`latency_p95_under_5s` runs the same fixture 10× to get a stable p95. Don't run more than 10 — cost adds up linearly. Budget: 5s p95. If we cross it persistently, options are:

- Drop the few-shot examples (saves ~3× input tokens but hurts calibration).
- Switch to a smaller model on this path (`claude-haiku-4-5`) — accept some accuracy loss.
- Investigate whether fixtures got too large (max 1MB after compression).

## Reading the report

`eval-results/report.ai-validation.json`:

```json
{
  "accuracy": 0.875,            // 7 of 8 cases passed
  "formatComplianceRate": 1.0,  // every response parsed as valid JSON
  "avgLatencyMs": 2400,
  "p95LatencyMs": 4100,
  "cases": [...]                // per-case detail with reason on failure
}
```

`accuracy < 1.0` deserves attention but isn't always a release blocker — read each failed case's `reason`. `formatComplianceRate < 1.0` is _always_ a blocker — means the schema enforcement broke.

## Running

```sh
# Locally — needs ANTHROPIC_API_KEY and FEW_SHOT_FIXTURES_BASE_URL in env.
npm run evals -- --suite ai-validation

# Specific output path
npm run evals -- --suite ai-validation --out /tmp/report.json

# Via jest (RUN_EVALS=1 to actually call API; otherwise placeholder pass)
RUN_EVALS=1 npm test __tests__/evals/ai-validation.eval.ts
```

CI: `.github/workflows/evals-vision.yml` — manual `workflow_dispatch` only. Never on every push (cost). Required before merging any change to `validate-find/index.ts` or eval client.

## What NOT to do

- **Don't mock Anthropic.** Mocked passes ≠ production passes; the whole point is end-to-end.
- **Don't widen assertions to silence flakes.** Diagnose and fix instead.
- **Don't add a 9th case for the prestige.** Each case adds ~5s + a few cents per run; only add when it covers a genuinely new failure mode.
- **Don't commit fixtures outside LFS.** They blow up clone size for everyone otherwise.
