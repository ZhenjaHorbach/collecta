// Edge Function: get-collection-stats
// Returns aggregated stats for a collection: total items, total finds, unique collectors.
// Results are computed on the fly; add a caching layer (e.g. Redis/KV) later if needed.
//
// Invoke: GET /functions/v1/get-collection-stats?collection_id=<uuid>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

// @ts-ignore — Deno URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface CollectionStats {
  collection_id: string;
  total_items: number;
  total_finds: number;
  unique_collectors: number;
  validated_finds: number;
}

async function fetchStats(collectionId: string): Promise<CollectionStats> {
  // TODO: implement aggregation queries
  // Hints:
  //   total_items     → count collection_items where collection_id = ?
  //   total_finds     → count finds joined through collection_items
  //   unique_collectors → count distinct user_id from finds (above join)
  //   validated_finds → count finds where ai_validated = true (above join)
  throw new Error("Not implemented");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const collectionId = url.searchParams.get("collection_id");

  if (!collectionId) {
    return new Response(
      JSON.stringify({ error: "collection_id query param is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { data: collection, error } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .single();

  if (error || !collection) {
    return new Response(JSON.stringify({ error: "Collection not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stats = await fetchStats(collectionId);

  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
