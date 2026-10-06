# 6. `@ts-ignore` in edge functions — inventory and proposal (no code change)

## Status

**Done (steps 1–3), verified with `deno check` (deno 2.9.7).** Step 4's
staging deploy is not done — no `supabase` CLI here, and deploys are out of
scope for this branch. The original plan (below) is kept for context.

### What changed

- `supabase/functions/tsconfig.json`: `allowImportingTsExtensions` +
  `noEmit` → plain-TS editors accept `.ts` relative imports. 29 ignores
  removed.
- `supabase/functions/deno.json`: `@supabase/supabase-js` now maps to
  `npm:@supabase/supabase-js@2` (was `https://esm.sh/...`). All inline
  `npm:` specifiers replaced with bare `@supabase/supabase-js` /
  `@anthropic-ai/sdk` (same pinned versions via the map). 11 ignores
  removed.
- 7× `declare const Deno: any` (+ their `eslint-disable`) removed — `Deno`
  is typed by the `deno.window` lib already in `deno.json`.
- `.vscode/settings.json`: `deno.enablePaths: ["supabase/functions"]`;
  `denoland.vscode-deno` added to recommended extensions, so the editor
  type-checks this folder the way Deno does.
- `supabase/CLAUDE.md`: import conventions + `deno check` before deploy.

### `deno check` results (`cd supabase/functions && deno check */index.ts`)

| Function                                                 | HEAD (`main`) | This branch |
| -------------------------------------------------------- | ------------- | ----------- |
| award-xp                                                 | 4 errors      | 4 (same)    |
| generate-collection                                      | 1 error       | **0**       |
| validate-find                                            | 7 errors      | 7 (same)    |
| delete-collection, get-collection-stats, on-user-created | 0             | 0           |

The fixed generate-collection error was the esm.sh vs `npm:` mismatch:
`src/agents/image-mirror.ts` resolved `@supabase/supabase-js` to esm.sh via
the map while the function passed an `npm:` client in.

Pre-existing, **not fixed** (unchanged by this branch):

- `@anthropic-ai/sdk@0.32.1` `Usage` type has no `cache_read_input_tokens` /
  `cache_creation_input_tokens` (award-xp, validate-find) — runtime returns
  them; bumping the SDK pin would fix the types.
- `No overload matches this call` on `messages.create` (award-xp,
  validate-find ×3) — message/tool literal types vs SDK 0.32.1 typings.
- Supabase join typing (`collection` / `achievements` typed as arrays) in
  validate-find (×3) and award-xp (×1).

### Risk to review

The map change switches the runtime source of `@supabase/supabase-js` for
`src/agents/*` (used by generate-collection) from esm.sh to npm — same as
every edge function already uses directly. Edge functions' own imports
resolve to the same pinned versions as before. Needs one staging deploy of
`generate-collection` to confirm the CLI bundles with this `deno.json`.

## Inventory (40 occurrences, 8 files)

| Reason in comment                                 | Count | What follows                                                                          |
| ------------------------------------------------- | ----- | ------------------------------------------------------------------------------------- |
| "Deno requires .ts extension on relative imports" | 29    | `../_shared/*.ts` (19), `../../../src/agents/*.ts` (10, all in `generate-collection`) |
| "Deno npm specifier"                              | 11    | `npm:@supabase/supabase-js@2` (8), `npm:@anthropic-ai/sdk@0.32.1` (3)                 |

| File                                                                        | Count  |
| --------------------------------------------------------------------------- | ------ |
| `generate-collection/index.ts`                                              | 16     |
| `validate-find/index.ts`                                                    | 8      |
| `award-xp/index.ts`                                                         | 7      |
| `delete-collection/index.ts`                                                | 4      |
| `get-collection-stats/index.ts`                                             | 2      |
| `_shared/anthropic-usage.ts`, `_shared/auth.ts`, `on-user-created/index.ts` | 1 each |

5 of the 40 were added in this branch (items 2, 4, 5) by following the
existing import pattern. Related rule debt in the same files:
`declare const Deno: any` with `eslint-disable no-explicit-any`.

## Who actually sees these errors

- Root `npx tsc --noEmit` — **no one**: `tsconfig.json` excludes
  `supabase/functions/**`. ESLint ignores the folder too.
- The editor's TS server, via `supabase/functions/tsconfig.json`
  (`moduleResolution: Bundler`, no `allowImportingTsExtensions`, no Deno
  types) — **yes**, that's what the ignores silence.
- `deno check` — would **not** report these: Deno resolves `.ts` imports and
  `npm:` specifiers natively.

## Why `@ts-expect-error` is not a safe swap

`@ts-expect-error` fails when there is no error underneath. The editor sees
an error; `deno check` does not. So `@ts-expect-error` would satisfy the
editor and **break `deno check`** ("Unused '@ts-expect-error' directive") —
the opposite of what we want. Whether `supabase functions deploy`
type-checks is unverified here.

## Proposed fix (root cause, needs `deno` to verify)

1. **Relative `.ts` imports (29):** add `"allowImportingTsExtensions": true`
   and `"noEmit": true` to `supabase/functions/tsconfig.json`. Plain TS then
   accepts `.ts` extensions; Deno already does. Delete the 29 ignores.
2. **`npm:` specifiers (11):** switch to bare specifiers resolved by
   `supabase/functions/deno.json` `imports` — Deno via the import map, the
   editor via the root `node_modules`. **Caveat:** the map currently points
   `@supabase/supabase-js` at `https://esm.sh/...`, while code uses `npm:`
   (deliberately, commit `5c16580`). Update the map to
   `npm:@supabase/supabase-js@2` first, or this silently changes the
   runtime dependency source.
3. Replace `declare const Deno: any` with Deno types (a `deno.ns` lib
   reference or the Supabase edge-runtime types).
4. Verify: `deno check supabase/functions/*/index.ts` clean, editor clean,
   then a staging deploy of one function before the rest.

Alternative if (1)–(3) don't pan out: document `supabase/functions/**` as an
explicit exception in `.claude/rules/code-style.md` instead of leaving a
silent rule violation.

## Out of scope

Any code change in this item.

## Follow-up: pre-existing `deno check` errors fixed (owner request)

All 11 remaining errors are gone — `deno check` is clean for all 6
functions.

- **SDK pin `@anthropic-ai/sdk` 0.32.1 → 0.92.0** in `deno.json` (same
  version as the root `package.json`, so Deno, Node scripts, evals and
  `src/agents/*` now share one SDK). 0.32.1's types predate GA prompt
  caching and URL image sources: no `cache_control` on `TextBlockParam`,
  no `source: { type: 'url' }`, no `cache_*_input_tokens` on `Usage`. The
  code already sent all three; only the types were wrong. Fixed 4 errors.
- **Local typing** (no runtime change): tool arrays typed as
  `Anthropic.Tool` instead of `as const` (readonly `required` didn't fit
  the SDK type); message arrays typed as `Anthropic.MessageParam[]` /
  `ToolResultBlockParam[]` instead of `unknown[]`; `'ephemeral' as const`.
- **supabase-js embeds** (3 errors): without generated DB types the client
  infers many-to-one embeds (`achievements(code)`, `collection:collections`,
  `collections(description)`) as arrays; PostgREST returns an object.
  Cast via `unknown` with a comment at each site. Proper fix: generated DB
  types for edge functions.

### Runtime evidence for the SDK bump (offline, no API call)

Deno script with the real SDK 0.92.0, the shared prompt/parse/config
modules and a stubbed `fetch` (first response 529, then a tool_use
message): 2 attempts (retry works with `maxRetries: 1`), request body has
`cache_control: ephemeral`, `source.type: 'url'`, 6 required tool fields;
response `usage.cache_read_input_tokens` readable; parser overrides
`valid=true` → `false` when `matches_claim=false`. The SDK's
"streaming required" guard only fires above ~21k `max_tokens`; ours are
≤ 4096. Still needs one real deploy to confirm on the Supabase edge runtime.

## Deploy decision

No staging project exists (only the production `collecta` project, which
is the CLI's linked default). Owner decision: verify on the first CI deploy
after merge (`deploy-supabase.yml` → `supabase functions deploy
--no-verify-jwt`). If bundling fails because the CLI doesn't pick up
`supabase/functions/deno.json`, the deploy errors out and the previously
deployed functions stay live; fix by adding
`--import-map supabase/functions/deno.json` to that workflow step.
