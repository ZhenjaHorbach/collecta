// Shared-secret check for Supabase Database Webhooks. Webhook functions are
// deployed with --no-verify-jwt (the caller is the database, not a user), so
// without this anyone who knows the URL can invoke them. The webhook is
// configured in the Dashboard to send the secret as a static HTTP header.
//
// Pure and import-free so Node tests can import it (see the exception in
// .claude/rules/testing.md).

export const WEBHOOK_SECRET_HEADER = 'x-webhook-secret';

// Constant-time comparison: the loop always walks the longer input so the
// time taken doesn't reveal how many leading characters matched. A missing or
// empty value on either side never validates — an unset env var must not
// turn the check into "accept everything".
export function isValidWebhookSecret(
  provided: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!provided || !expected) return false;
  const length = Math.max(provided.length, expected.length);
  let diff = provided.length ^ expected.length;
  for (let i = 0; i < length; i++) {
    diff |= (provided.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }
  return diff === 0;
}
