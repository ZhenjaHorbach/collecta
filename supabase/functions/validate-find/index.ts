// Edge Function: validate-find
// Called after a find is created. Fetches the photo, sends it to Claude Vision,
// and writes the result (ai_validated, ai_confidence, ai_notes) back to finds.
//
// Invoke: POST /functions/v1/validate-find
// Body: { find_id: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

// @ts-ignore — Deno URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore — Deno URL import
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
});

interface RequestBody {
  find_id: string;
}

interface ValidationResult {
  validated: boolean;
  confidence: number; // 0–1
  notes: string;
}

async function validateWithClaude(
  photoUrl: string,
  validationPrompt: string,
): Promise<ValidationResult> {
  // TODO: implement Claude Vision call
  // Hint: use anthropic.messages.create with image content block
  // model: "claude-opus-4-7" (latest, most capable)
  throw new Error("Not implemented");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { find_id } = body;
  if (!find_id) {
    return new Response(JSON.stringify({ error: "find_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch find + collection item (for ai_validation_prompt)
  const { data: find, error: findError } = await supabase
    .from("finds")
    .select(`
      id,
      photo_url,
      collection_items (
        ai_validation_prompt
      )
    `)
    .eq("id", find_id)
    .single();

  if (findError || !find) {
    return new Response(JSON.stringify({ error: "Find not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validationPrompt = find.collection_items?.ai_validation_prompt;
  if (!validationPrompt) {
    return new Response(
      JSON.stringify({ error: "No validation prompt for this item" }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  const result = await validateWithClaude(find.photo_url, validationPrompt);

  const { error: updateError } = await supabase
    .from("finds")
    .update({
      ai_validated: result.validated,
      ai_confidence: result.confidence,
      ai_notes: result.notes,
    })
    .eq("id", find_id)
    .throwOnError();

  if (updateError) {
    return new Response(JSON.stringify({ error: "Failed to update find" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
