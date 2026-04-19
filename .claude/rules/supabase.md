# Supabase Integration Rules

## Security
- RLS (Row Level Security) first — every table must have RLS enabled and policies defined
- Never bypass RLS with service role key on the client
- Auth state checked via `supabase.auth.getSession()`, not localStorage

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
