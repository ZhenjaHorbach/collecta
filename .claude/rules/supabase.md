# Supabase Integration Rules

## Security

- RLS (Row Level Security) first — every table must have RLS enabled and policies defined
- Never bypass RLS with service role key on the client
- Auth state checked via `supabase.auth.getSession()`, not localStorage

## Edge function caller auth

Every edge function that does **anything user-scoped** (writes a row, charges Anthropic, mutates state on behalf of a user) MUST verify the caller's JWT before doing work. Without this, any logged-in user can spoof another `user_id` in the request body or anonymously trigger paid API calls. RLS does NOT save you here — edge functions run with the **service role key** which bypasses RLS by design.

Use the helpers in `supabase/functions/_shared/auth.ts`:

```ts
import { authenticateRequest, authorizeRequest } from '../_shared/auth.ts';

// Body has a user_id the function will mutate state for:
const auth = await authorizeRequest(req, body.user_id);
if (!auth.ok) return jsonError(auth.status, auth.error);
// auth.userId === body.user_id from here on.

// Body has no user_id, just need authenticated caller (e.g. paid API gate):
const auth = await authenticateRequest(req);
if (!auth.ok) return jsonError(auth.status, auth.error);
const userId = auth.userId;
```

Returns are `{ ok: true, userId } | { ok: false, status: 401|403, error: 'unauthorized'|'forbidden' }`. No exceptions — keeps the call site flat.

Rules:

- **Never** roll your own JWT parsing in a new function. Use the helper or extend it.
- **Always** call the auth helper BEFORE any DB write or Anthropic call. A 401 should cost less than $0.0001, not a full Vision invocation.
- The helper requires `SUPABASE_SERVICE_ROLE_KEY` in env (already set on every deployed function).
- `--no-verify-jwt` on `supabase functions deploy` is fine — the helper runs the equivalent check explicitly. Keeping `--no-verify-jwt` lets the function return a custom error body instead of Supabase's gateway-level rejection.

Functions currently using this pattern: `award-xp` (authorize), `generate-collection` (authenticate), `validate-find` (authenticate). Webhooks like `on-user-created` use a different model — verify the webhook secret instead.

## Queries

- Use generated types from `supabase gen types typescript` — never write raw string types
- All queries must be typed: `supabase.from('table').select('*').returns<MyType[]>()`
- Prefer `.throwOnError()` for mutations so errors surface immediately
- Use `.select()` after `.insert()` / `.update()` to get the mutated row back

## Migrations

- All schema changes go in `/supabase/migrations/` as numbered SQL files: `001_init.sql`, `002_add_rls.sql`
- Never mutate the database schema directly in production without a migration file
- Include both `up` logic and a comment describing the rollback steps

## Storage

- Use signed URLs for private assets, never expose storage bucket as public unless explicitly needed
- Image uploads go through `src/services/storage.service.ts`

## Realtime

- Subscribe to realtime only in hooks (`src/hooks/`), unsubscribe on cleanup
- Use PowerSync for offline-first data; Supabase Realtime for live collaborative features only
