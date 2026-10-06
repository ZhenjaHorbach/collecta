# 9. Webhook secret for on-user-created + stale `functions logs` docs

## Problem

1. `supabase/functions/on-user-created` is deployed with `--no-verify-jwt`
   and checks nothing: any POST with an INSERT-on-users payload is
   accepted (verified against production on 2026-10-06: an unauthenticated
   POST returned 200). Today it only logs `user.id` and
   `user.email`, so the impact is forged log lines and attacker-chosen PII in
   logs — but every side effect planned in its TODO (welcome email, joining
   default collections) would be callable by anyone.
   `.claude/rules/supabase.md` already says webhooks must verify a secret.
2. Docs tell people to run `supabase functions logs <fn>`. The Supabase CLI
   (2.119) has no `logs` subcommand; logs are in the Dashboard.

## Approach

- New pure helper `supabase/functions/_shared/webhook-secret.ts`:
  `isValidWebhookSecret(provided, expected)` — constant-time comparison,
  `false` when either side is missing/empty. Import-free (Node-testable).
- `on-user-created`: before parsing the body, read header
  `x-webhook-secret` and compare with env `DB_WEBHOOK_SECRET`.
  - env not set → `500 webhook_secret_not_configured` + `console.error`
    (**fail closed** — a missing secret must not silently reopen the hole);
  - mismatch → `401 unauthorized`.
- Stop logging the email (log `user.id` only) — no PII in function logs.
- Docs: replace every `supabase functions logs …` with the Dashboard path
  (Edge Functions → function → Logs).

## Files I may change

- `supabase/functions/_shared/webhook-secret.ts` (new) + test (new)
- `supabase/functions/on-user-created/index.ts`
- `.claude/rules/supabase.md` (webhook pattern), `.claude/rules/gamification.md`,
  `.claude/commands/deploy-supabase.md`, `docs/release.md`,
  `docs/specs/8-error-tracking.md`, comment in `award-xp/index.ts`

## Constraints

- No migration, no workflow change, no secret values in the repo.
- Not deployed by me. Rollout order matters (below).

## Rollout (manual, in this order)

1. Generate a secret: `openssl rand -hex 32`.
2. `supabase secrets set DB_WEBHOOK_SECRET=<value> --project-ref <ref>`.
3. Dashboard → Database → Webhooks → the `auth.users` INSERT webhook →
   HTTP Headers → add `x-webhook-secret: <value>`. (If the webhook was never
   created, nothing calls this function today — create it with the header.)
4. Merge → CI deploys. Until steps 2–3 are done, real webhook calls get
   500/401; today that only loses a log line.
5. Verify: unauthenticated POST → 401; sign up a test user → function log
   shows `New user created: <id>`.

## Acceptance checks

- Unit tests: match, mismatch, different length, missing header, missing
  or empty env.
- `deno check supabase/functions/on-user-created/index.ts` clean.
- `npx tsc --noEmit`, `npx eslint . --max-warnings 0`, `npm test -- --ci`.
- `grep -rn "functions logs"` → no instructions left (only this spec's
  description of the problem).

## Out of scope

- HMAC request signing (Supabase DB webhooks send static headers, not
  signatures).
- The TODO side effects themselves.
