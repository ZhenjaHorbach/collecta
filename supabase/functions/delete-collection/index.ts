// Edge Function: delete-collection
// Atomically removes a collection the caller owns, plus the Storage objects
// that hang off its finds. The cascade in 001_init.sql already wipes
// collection_items / finds / reactions / user_collections, but Storage
// files are NOT covered by FK cascade — we MUST clean them up explicitly
// before issuing the DELETE, otherwise we leave orphan blobs in the
// finds-photos bucket forever.
//
// Why an edge function rather than a client-side delete (RLS would allow
// it — see "collections: owner can delete" in 001_init.sql):
//   * Storage cleanup needs the service-role key. Doing it from the client
//     means either trusting the client to fire-and-forget removals (it
//     won't on flaky networks) or writing a per-bucket policy that lets
//     a user nuke files cross-row, which is wider than we want.
//   * One server round-trip vs N. Caller stays offline-tolerant.
//
// Counter recompute: NOT needed. finds_count / reactions_given /
// collections_complete are computed on read in award-xp/index.ts via COUNT
// queries + count_completed_collections RPC. There are no denormalized
// counter columns to decrement. XP and unlocked achievements are
// "earned forever" by design — we don't roll them back.
//
// Invoke: POST /functions/v1/delete-collection
// Body:   { collection_id: string }
// Auth:   user JWT required; caller must be the collection's creator.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

// @ts-ignore — Deno npm specifier
import { createClient } from 'npm:@supabase/supabase-js@2';

// @ts-ignore — Deno requires .ts extension on relative imports
import { authenticateRequest } from '../_shared/auth.ts';
// @ts-ignore — Deno requires .ts extension on relative imports
import { objectKeyFromPublicUrl } from '../_shared/storage-keys.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PHOTOS_BUCKET = 'finds-photos';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const auth = await authenticateRequest(req);
  if (!auth.ok) return json(auth.status, { error: auth.error });
  const userId = auth.userId;

  let body: { collection_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  const collectionId = typeof body.collection_id === 'string' ? body.collection_id.trim() : '';
  if (!collectionId) return json(400, { error: 'collection_id is required' });

  // Ownership check. RLS would also block the eventual DELETE if the
  // caller isn't the owner, but we want a clean 403 BEFORE doing any
  // Storage work — half-completed cleanups are worse than no cleanup.
  const { data: collection, error: selectErr } = await admin
    .from('collections')
    .select('id, creator_id')
    .eq('id', collectionId)
    .maybeSingle();
  if (selectErr) return json(500, { error: 'lookup_failed', message: selectErr.message });
  if (!collection) return json(404, { error: 'not_found' });
  if (collection.creator_id !== userId) return json(403, { error: 'forbidden' });

  // Pull every find that hangs off this collection. `finds` has no direct
  // collection_id column — it FKs to collection_items, which FKs to
  // collections — so we filter through an inner join on the embedded
  // collection_items.collection_id. One query; no pagination needed at
  // our scale (a single collection holds tens of finds at most).
  const { data: finds, error: findsErr } = await admin
    .from('finds')
    .select('id, photo_url, collection_items!inner(collection_id)')
    .eq('collection_items.collection_id', collectionId);
  if (findsErr) return json(500, { error: 'finds_lookup_failed', message: findsErr.message });

  const findRows = (finds ?? []) as Array<{ id: string; photo_url: string | null }>;
  const objectKeys = findRows
    .map((f) => f.photo_url)
    .filter((url): url is string => Boolean(url))
    .map((url) => objectKeyFromPublicUrl(url, PHOTOS_BUCKET))
    .filter((key): key is string => Boolean(key));

  // Best-effort batch remove. If Storage hiccups we still proceed with the
  // SQL DELETE — orphan blobs are recoverable later (TODO: periodic sweep
  // job), but a half-deleted collection that still appears in feeds is a
  // worse user experience.
  if (objectKeys.length > 0) {
    const { error: storageErr } = await admin.storage.from(PHOTOS_BUCKET).remove(objectKeys);
    if (storageErr) {
      console.warn('[delete-collection] storage cleanup failed', {
        collectionId,
        count: objectKeys.length,
        message: storageErr.message,
      });
    }
  }

  // reports.target_id has no FK (it's a polymorphic ref to either a
  // collection or a find), so cascade won't touch it. Drop reports
  // pointed at this collection AND at any of its finds. The finds rows
  // themselves go away via cascade in the next step.
  await admin
    .from('reports')
    .delete()
    .eq('target_type', 'collection')
    .eq('target_id', collectionId);
  const findIds = findRows.map((f) => f.id);
  if (findIds.length > 0) {
    await admin.from('reports').delete().eq('target_type', 'find').in('target_id', findIds);
  }

  // The cascade does the rest: collection_items → finds → reactions and
  // user_collections (all FK'd with `on delete cascade` in 001_init.sql).
  // forked_from is `on delete set null` — children of this collection
  // keep existing, just lose their lineage badge.
  const { error: deleteErr } = await admin.from('collections').delete().eq('id', collectionId);
  if (deleteErr) return json(500, { error: 'delete_failed', message: deleteErr.message });

  return json(200, { success: true });
});
