// Shared caller-auth helpers for edge functions.
//
// Why: every user-scoped function MUST verify the caller's JWT before doing
// work — otherwise any logged-in user can spoof another user_id in the
// request body and trigger writes/charges on their behalf. This module is
// the single canonical implementation; new functions should call one of
// these helpers, not roll their own JWT parsing.
//
// Read .claude/rules/supabase.md → "Edge function caller auth" before
// adding a new function.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

// @ts-ignore — Deno npm specifier
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

let cached: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  return cached;
}

export interface AuthOk {
  ok: true;
  userId: string;
}
export interface AuthErr {
  ok: false;
  status: 401 | 403;
  error: 'unauthorized' | 'forbidden';
}
export type AuthResult = AuthOk | AuthErr;

// Returns the authenticated user's id, or an error result the caller turns
// into an HTTP response. No exceptions — keeps the call site flat.
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, error: 'unauthorized' };
  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data?.user) return { ok: false, status: 401, error: 'unauthorized' };
  return { ok: true, userId: data.user.id };
}

// Same as authenticateRequest, plus enforces that the caller IS the user
// referenced in the request body. Use whenever the body carries a user_id
// the function will mutate state for.
export async function authorizeRequest(req: Request, expectedUserId: string): Promise<AuthResult> {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return auth;
  if (auth.userId !== expectedUserId) {
    return { ok: false, status: 403, error: 'forbidden' };
  }
  return auth;
}
