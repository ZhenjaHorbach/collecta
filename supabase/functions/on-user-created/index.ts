// Edge Function: on-user-created
// Webhook triggered by the auth.users INSERT trigger (via Supabase Database Webhooks).
// Use this for side-effects that can't live in a SQL trigger:
// e.g. sending a welcome email, provisioning default user_collections, analytics events.
//
// Set up in Supabase Dashboard → Database → Webhooks:
//   Table: auth.users  |  Event: INSERT  |  URL: /functions/v1/on-user-created

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

// @ts-ignore — Deno URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface AuthUserRecord {
  id: string;
  email: string;
  raw_user_meta_data: Record<string, string>;
  created_at: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: AuthUserRecord;
  schema: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (payload.type !== "INSERT" || payload.table !== "users") {
    return new Response(JSON.stringify({ skipped: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = payload.record;

  // TODO: add post-signup side effects here, e.g.:
  //   - send welcome email via Resend / SendGrid
  //   - join user to featured/default collections
  //   - emit analytics event
  console.log("New user created:", user.id, user.email);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
