// Backfill: rewrite external Wikipedia / Unsplash image URLs in
// `collection_items.example_image_url` and `collections.cover_image_url`
// to point at our Supabase Storage mirror.
//
// Background: Wikimedia rate-limits unauthenticated mobile traffic
// (HTTP 429), making external URLs unreliable on-device. The generator
// now mirrors at create-time (see src/agents/image-mirror.ts); this
// script is a one-shot to fix rows that were saved before that change.
//
// Idempotent: rows already pointing at our bucket are skipped.
// Failure-tolerant: a row whose source URL no longer resolves is left
// as-is and reported at the end — we don't blank it out so manual
// re-curation stays possible.
//
// Usage:
//   scripts/backfill-collection-images.sh           # process all rows
//   scripts/backfill-collection-images.sh --dry     # report only, no writes
//
// Env (required):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

import { isMirroredUrl, mirrorImageToStorage } from '../src/agents/image-mirror';

interface Row {
  id: string;
  url: string;
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  const dryRun = process.argv.includes('--dry');

  const client = createClient(supabaseUrl, serviceRoleKey);

  // collection_items.example_image_url
  const { data: itemsRaw, error: itemsErr } = await client
    .from('collection_items')
    .select('id, example_image_url')
    .not('example_image_url', 'is', null);
  if (itemsErr) throw itemsErr;
  const items: Row[] = (itemsRaw ?? [])
    .filter(
      (r): r is { id: string; example_image_url: string } =>
        typeof r.example_image_url === 'string' && r.example_image_url.length > 0
    )
    .map((r) => ({ id: r.id, url: r.example_image_url }));

  // collections.cover_image_url
  const { data: covsRaw, error: covsErr } = await client
    .from('collections')
    .select('id, cover_image_url')
    .not('cover_image_url', 'is', null);
  if (covsErr) throw covsErr;
  const covers: Row[] = (covsRaw ?? [])
    .filter(
      (r): r is { id: string; cover_image_url: string } =>
        typeof r.cover_image_url === 'string' && r.cover_image_url.length > 0
    )
    .map((r) => ({ id: r.id, url: r.cover_image_url }));

  const itemsToMigrate = items.filter((r) => !isMirroredUrl(r.url));
  const coversToMigrate = covers.filter((r) => !isMirroredUrl(r.url));

  console.log(
    `[backfill] items=${items.length} (migrate=${itemsToMigrate.length}), covers=${covers.length} (migrate=${coversToMigrate.length})`
  );
  if (dryRun) {
    console.log('[backfill] dry-run — no writes');
    return;
  }

  // Shared URL → mirrored URL cache so we don't re-download the same
  // Wikimedia object once per item AND once per cover.
  const cache = new Map<string, string | null>();
  const mirror = async (url: string): Promise<string | null> => {
    if (cache.has(url)) return cache.get(url)!;
    const result = await mirrorImageToStorage(url, { supabaseUrl, serviceRoleKey, client });
    cache.set(url, result);
    return result;
  };

  let itemsOk = 0;
  let itemsFail = 0;
  for (const row of itemsToMigrate) {
    const next = await mirror(row.url);
    if (!next) {
      itemsFail++;
      console.warn(`[backfill] FAIL item ${row.id} ${row.url}`);
      continue;
    }
    const { error } = await client
      .from('collection_items')
      .update({ example_image_url: next })
      .eq('id', row.id);
    if (error) {
      itemsFail++;
      console.warn(`[backfill] DB error item ${row.id}: ${error.message}`);
      continue;
    }
    itemsOk++;
  }

  let coversOk = 0;
  let coversFail = 0;
  for (const row of coversToMigrate) {
    const next = await mirror(row.url);
    if (!next) {
      coversFail++;
      console.warn(`[backfill] FAIL cover ${row.id} ${row.url}`);
      continue;
    }
    const { error } = await client
      .from('collections')
      .update({ cover_image_url: next })
      .eq('id', row.id);
    if (error) {
      coversFail++;
      console.warn(`[backfill] DB error cover ${row.id}: ${error.message}`);
      continue;
    }
    coversOk++;
  }

  console.log(
    `[backfill] done — items ok=${itemsOk} fail=${itemsFail}, covers ok=${coversOk} fail=${coversFail}`
  );
}

main().catch((err) => {
  console.error('[backfill] fatal:', err);
  process.exit(1);
});
