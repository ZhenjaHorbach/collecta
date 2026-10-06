// Edge Function: on-user-created
// Webhook triggered by the auth.users INSERT trigger (via Supabase Database Webhooks).
// Use this for side-effects that can't live in a SQL trigger:
// e.g. sending a welcome email, provisioning default user_collections, analytics events.
//
// Set up in Supabase Dashboard → Database → Webhooks:
//   Table: auth.users  |  Event: INSERT  |  URL: /functions/v1/on-user-created
//   HTTP Headers: x-webhook-secret: <same value as the DB_WEBHOOK_SECRET
//   function secret>. Deployed with --no-verify-jwt, so this header is the
//   only thing stopping arbitrary callers. See
//   docs/specs/9-webhook-secret-and-logs-docs.md for rollout.

import { createClient } from '@supabase/supabase-js';

import { isValidWebhookSecret, WEBHOOK_SECRET_HEADER } from '../_shared/webhook-secret.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface AuthUserRecord {
  id: string;
  email: string;
  raw_user_meta_data: Record<string, string>;
  created_at: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: AuthUserRecord;
  schema: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Verify the webhook secret BEFORE reading the body. Fail closed when the
  // secret isn't configured — an unset env var must not reopen the endpoint.
  const expectedSecret = Deno.env.get('DB_WEBHOOK_SECRET');
  if (!expectedSecret) {
    console.error('[on-user-created] DB_WEBHOOK_SECRET is not set — rejecting');
    return new Response(JSON.stringify({ error: 'webhook_secret_not_configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!isValidWebhookSecret(req.headers.get(WEBHOOK_SECRET_HEADER), expectedSecret)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (payload.type !== 'INSERT' || payload.table !== 'users') {
    return new Response(JSON.stringify({ skipped: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = payload.record;

  // TODO: add post-signup side effects here, e.g.:
  //   - send welcome email via Resend / SendGrid
  //   - join user to featured/default collections
  //   - emit analytics event
  // Id only — no email (PII) in function logs.
  console.log('[on-user-created] New user created:', user.id);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
