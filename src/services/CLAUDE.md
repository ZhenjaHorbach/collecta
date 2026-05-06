# Service layer — additions on top of root CLAUDE.md

This file adds rules that only apply inside `src/services/`. The root
`CLAUDE.md` and `.claude/rules/architecture.md` / `.claude/rules/supabase.md`
still apply — read them first. Only the points below are extra.

## Anthropic calls

Every Anthropic call site MUST go through the cost-tracking helper, not
inline counters. We're past the mini variant — usage lands in the `ai_calls`
table.

- Edge functions: `supabase/functions/_shared/anthropic-usage.ts` →
  `extractUsage` + `logAiCall`. See `validate-find` and `award-xp` for the
  pattern.
- Node-side scripts: the same shape lives in `src/agents/types.ts`
  (`normalizeUsage`, `sumUsage`) and a script-local `logAiCall` writes to
  `ai_calls` via the service-role client.

Never count tokens inline at the call site or persist them on a parent row.

## Service ⇄ component boundary

- `src/services/*` does not import from `src/hooks/`, `src/components/`,
  `src/screens/`, `src/app/`. Import direction is one-way per
  `.claude/rules/architecture.md`.
- Realtime subscriptions live in `src/hooks/use*.ts`. A service either
  returns a `Promise` or an async iterator — never mounts a Supabase
  channel.

## Mutations through Supabase

- All writes use `.select().single().throwOnError()` so the service returns
  the mutated row and surfaces RLS errors as exceptions instead of silent
  empty rows.
- Forking a collection goes through the `fork_collection` RPC (migration
  016), never a manual `insert` chain — RLS would block reading items off
  a foreign collection during the copy step.
- Cross-table reads that need joins (Discover counts, find with collection)
  go through RPCs (`rpc_discover_collections`, `count_completed_collections`,
  `get_personalized_feed`) so we keep one round-trip per screen.

## Type discipline

- All Supabase queries are typed via the generated `Tables<>` /
  `TablesInsert<>` from `src/types/database.ts`.
- Rows that flow into the rest of the app (cards, screens, the camera flow)
  are validated with the Zod schemas in `src/schemas/index.ts` before
  leaving the service. TypeScript types are erased at runtime; the schema
  catches Supabase drift the typecheck can't.
