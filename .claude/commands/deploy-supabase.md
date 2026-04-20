# /deploy-supabase

Deploy Supabase edge functions and/or migrations to the linked project.

## Pre-flight checks

Before deploying, verify:
1. The branch is `main` or this is an explicit manual deploy
2. `supabase link` has been run (`supabase/.temp/project-ref` exists or `SUPABASE_PROJECT_ID` is set)
3. No pending uncommitted migration files

## Commands

### Deploy everything (migrations + all functions)
```bash
supabase db push --include-all
supabase functions deploy --no-verify-jwt
```

### Deploy a single function
```bash
supabase functions deploy <function-name> --no-verify-jwt
```

Available functions:
- `validate-find` — AI photo validation via Claude Vision
- `get-collection-stats` — aggregated collection statistics
- `on-user-created` — post-signup side effects (webhook)

### Migrations only
```bash
supabase db push --include-all
```

### Check what would be deployed (dry run)
```bash
supabase db push --dry-run
```

## Required secrets / env vars

| Variable | Where |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | `supabase.com → Account → Access Tokens` |
| `SUPABASE_PROJECT_ID` | `supabase.com → Project → Settings → General → Reference ID` |

## Trigger CI deploy without a code change

```bash
gh workflow run deploy-supabase.yml \
  --field deploy_functions=true \
  --field run_migrations=true
```
