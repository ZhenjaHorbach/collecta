# /deploy-supabase

Deploy Supabase migrations and/or edge functions to the linked project. Full workflow rules live in `.claude/rules/ci.md` — this command is the execution path.

## Arguments

`$ARGUMENTS` selects target:

- _(empty)_ — everything: migrations + all functions under `supabase/functions/`.
- `migrations` — `supabase db push --include-all` only.
- `functions` — all edge functions, no migrations.
- `<function-name>` — a single edge function. Must exist in `supabase/functions/`; verify via `ls supabase/functions/` before invoking.
- `dry-run` — `supabase db push --dry-run` (no deploy, just diff).

Reject unknown args rather than guess.

## Hard gates (stop if any fails)

1. **Branch.** `git branch --show-current` is `main`. On any other branch, confirm with the user before proceeding — prod deploys from feature branches are a footgun.
2. **Working tree clean.** `git status --porcelain` is empty. Uncommitted migration files deploy inconsistent state. Abort if dirty.
3. **Link present.** `supabase/.temp/project-ref` exists OR `$SUPABASE_PROJECT_ID` is set in env. If neither, stop and tell the user to run `supabase link` or export the var.
4. **Auth present.** `$SUPABASE_ACCESS_TOKEN` is set (CLI auth) OR the user is already logged in via `supabase login`. If neither, abort.

All four are blocking unless the user explicitly overrides in their invocation (e.g. `/deploy-supabase --force` — not implemented; ask).

## Execution

Pick the exact command from the arg:

| Arg               | Command                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| _(empty)_         | `supabase db push --include-all && supabase functions deploy --no-verify-jwt` |
| `migrations`      | `supabase db push --include-all`                                              |
| `functions`       | `supabase functions deploy --no-verify-jwt`                                   |
| `<function-name>` | `supabase functions deploy <function-name> --no-verify-jwt`                   |
| `dry-run`         | `supabase db push --dry-run`                                                  |

Stream output — don't suppress stderr. If any step exits non-zero, stop and surface the error verbatim.

## Post-deploy verify

After a successful deploy:

1. **Functions** — `supabase functions list` shows the new deploy timestamp for each touched function.
2. **Migrations** — `supabase db diff` returns empty (no drift between local and remote).
3. **Smoke** — if a function was deployed, tail logs briefly: `supabase functions logs <name> --tail` for ~30s, report any errors.

Report which of the three checks passed in the final message.

## CI trigger (when local deploy isn't possible)

```bash
gh workflow run deploy-supabase.yml \
  --field deploy_functions=true \
  --field run_migrations=true
```

Use this when the user's local env lacks auth and they'd rather deploy via CI.

## Non-goals

- Don't deploy from a dirty working tree or a non-`main` branch without explicit confirmation.
- Don't skip the post-deploy verify — a green CLI exit doesn't guarantee the function is serving traffic.
- Don't hardcode function names in this file — discover via `ls supabase/functions/`.
- Don't invoke `--no-verify-jwt` on functions that require JWT (if any exist, the user's function code should enforce; flag to user if uncertain).
- Don't run migrations and functions as separate `gh workflow run` invocations — the CI job handles ordering.
