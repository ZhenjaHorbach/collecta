// Idempotent seeder for the Maestro test user. Runs before any
// authenticated E2E flow (locally or in CI) to guarantee:
//
//   1. The test account exists with a known email/password.
//   2. The email is pre-confirmed, so the SignIn flow lands on the
//      Feed instead of getting stuck on the Verify screen.
//   3. The account's previous run residue (finds, owned collections,
//      reactions) is cleared, so flow N never depends on flow N-1.
//
// Uses SUPABASE_SERVICE_ROLE_KEY because:
//   - auth.admin.{createUser, updateUserById} require admin.
//   - email_confirm: true bypasses the email-OTP gate, which only
//     service_role can do.
//   - Cleanup deletes rows by user_id / creator_id; with the anon key,
//     RLS would gate that to "rows the test user can see".
//
// NEVER ship this script's logic into the app — service_role bypasses
// all RLS, leakage = full DB access. Lives in scripts/ (server-side
// only per .claude/rules/architecture.md).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Same env vars the Welcome screen's Dev sign-in button reads — one
// source of truth so seed and bundle never drift. Server-side use of
// EXPO_PUBLIC_* is fine here (this script never runs in the bundle).
const TEST_EMAIL = process.env.EXPO_PUBLIC_TEST_EMAIL ?? 'test@collecta.app';
const TEST_PASSWORD = process.env.EXPO_PUBLIC_TEST_PASSWORD;
const TEST_USERNAME = 'maestro_test';
const TEST_DISPLAY_NAME = 'Maestro Test';

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (admin operations).');
  }
  if (!TEST_PASSWORD) {
    throw new Error(
      'EXPO_PUBLIC_TEST_PASSWORD is required. Set in .env locally or as a CI secret.'
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Resolve or create the user. Try createUser first — fastest path
  // and avoids a listUsers scan that's been seen to 500 with larger
  // `perPage` values on the hosted GoTrue. If the email is taken, fall
  // back to a public.users lookup by stable username (the lookup avoids
  // GoTrue admin/users entirely, which has been seen to 500 on the
  // hosted instance even via direct fetch).
  let userId: string;
  const created = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (!created.error) {
    userId = created.data.user.id;
    console.log(`[maestro-seed] created user ${userId} (${TEST_EMAIL})`);
  } else if (created.error.code === 'email_exists' || created.error.status === 422) {
    const foundId = await findUserIdByUsername(admin, TEST_USERNAME);
    if (!foundId) {
      throw new Error(
        `createUser said email_exists but no public.users row matched username=${TEST_USERNAME}. ` +
          `If you renamed TEST_USERNAME, delete the test user via Supabase dashboard and re-run.`
      );
    }
    const { data, error } = await admin.auth.admin.updateUserById(foundId, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`[maestro-seed] reused user ${userId} (${TEST_EMAIL})`);
  } else {
    throw created.error;
  }

  // 2. Make sure the public.users row exists with stable username/display.
  // The on-user-created trigger handles this for new accounts, but an
  // upsert here keeps the row valid even if migrations changed the
  // trigger shape.
  const { error: upsertErr } = await admin.from('users').upsert(
    {
      id: userId,
      username: TEST_USERNAME,
      display_name: TEST_DISPLAY_NAME,
    },
    { onConflict: 'id' }
  );
  if (upsertErr) throw upsertErr;

  // 3. Cleanup residue. Order matters: child rows before parents to
  // satisfy FK constraints even if cascading isn't set up everywhere.
  await admin.from('reactions').delete().eq('user_id', userId).throwOnError();
  await admin.from('finds').delete().eq('user_id', userId).throwOnError();
  await admin.from('collections').delete().eq('creator_id', userId).throwOnError();
  await admin.from('user_collections').delete().eq('user_id', userId).throwOnError();

  console.log(`[maestro-seed] cleaned residue for ${userId}`);

  // 4. Seed one collection owned by the test user so Mine tab and
  // collection-detail flows have something deterministic to anchor on.
  // Title is intentionally generic — flows match the testID by regex
  // (collection-card-.*), not by copy.
  const { error: insertErr } = await admin
    .from('collections')
    .insert({
      creator_id: userId,
      title: 'Maestro Test Collection',
      description: 'Seeded by scripts/maestro-seed.ts for E2E flows.',
      is_public: true,
    })
    .throwOnError();
  if (insertErr) throw insertErr;

  console.log('[maestro-seed] seeded test collection');
  console.log('[maestro-seed] done.');
}

async function findUserIdByUsername(
  admin: SupabaseClient,
  username: string
): Promise<string | null> {
  const { data, error } = await admin
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle<{ id: string }>();
  if (error) throw error;
  return data?.id ?? null;
}

main().catch((err) => {
  console.error('[maestro-seed] failed:', err);
  process.exit(1);
});
