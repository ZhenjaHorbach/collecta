import {
  CollectionSchema,
  CollectionItemSchema,
  FindSchema,
  type Collection,
  type CollectionItem,
  type Find,
} from '@schemas';
import type { TablesInsert } from '@typings/database';

import { supabase } from './supabase.service';

export type { Collection, CollectionItem, Find };

const CollectionListSchema = CollectionSchema.array();
const CollectionItemListSchema = CollectionItemSchema.array();
const FindListSchema = FindSchema.array();

export type CreateCollectionInput = Omit<
  TablesInsert<'collections'>,
  'id' | 'created_at' | 'updated_at'
>;

export type CreateItemInput = Omit<
  TablesInsert<'collection_items'>,
  'id' | 'collection_id' | 'created_at' | 'updated_at' | 'sort_order'
>;

export interface CollectionWithProgress extends Collection {
  items_count: number;
  found_count: number;
}

export interface CollectionItemWithFound extends CollectionItem {
  found: boolean;
}

export interface CollectionDetail extends Collection {
  items: CollectionItemWithFound[];
  finds: Find[];
  // Creator's finds for this collection, used to fill empty cells with the
  // creator's example shots when a non-owner is browsing. RLS ensures these
  // are only visible if the collection is public; otherwise the array is
  // empty and the screen falls back to `example_image_url`.
  referenceFinds: Find[];
  // Title of the source collection when this is a fork — drives the
  // "Forked from «X»" badge on the owner's view. Null for original
  // collections (forked_from === null) or when the source was deleted.
  forkedFromTitle: string | null;
}

async function attachProgress(
  collections: Collection[],
  userId: string
): Promise<CollectionWithProgress[]> {
  if (collections.length === 0) return [];

  const ids = collections.map((c) => c.id);

  const { data: items, error: itemsErr } = await supabase
    .from('collection_items')
    .select('id, collection_id')
    .in('collection_id', ids);
  if (itemsErr) throw itemsErr;

  const itemsByCollection = new Map<string, string[]>();
  for (const item of items ?? []) {
    const arr = itemsByCollection.get(item.collection_id);
    if (arr) arr.push(item.id);
    else itemsByCollection.set(item.collection_id, [item.id]);
  }

  const allItemIds = (items ?? []).map((i) => i.id);
  const itemToCollection = new Map<string, string>();
  for (const item of items ?? []) itemToCollection.set(item.id, item.collection_id);

  let foundByCollection = new Map<string, Set<string>>();
  if (allItemIds.length > 0) {
    const { data: finds, error: findsErr } = await supabase
      .from('finds')
      .select('collection_item_id')
      .eq('user_id', userId)
      .in('collection_item_id', allItemIds);
    if (findsErr) throw findsErr;

    foundByCollection = new Map();
    for (const find of finds ?? []) {
      const collId = itemToCollection.get(find.collection_item_id);
      if (!collId) continue;
      const set = foundByCollection.get(collId);
      if (set) set.add(find.collection_item_id);
      else foundByCollection.set(collId, new Set([find.collection_item_id]));
    }
  }

  return collections.map((c) => ({
    ...c,
    items_count: itemsByCollection.get(c.id)?.length ?? 0,
    found_count: foundByCollection.get(c.id)?.size ?? 0,
  }));
}

export async function listMyCollections(userId: string): Promise<CollectionWithProgress[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('creator_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return attachProgress(CollectionListSchema.parse(data ?? []), userId);
}

export async function listPickedUpCollections(userId: string): Promise<CollectionWithProgress[]> {
  const { data, error } = await supabase
    .from('user_collections')
    .select('collections(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });
  if (error) throw error;

  const collections = (data ?? [])
    .map((row) => (row.collections ? CollectionSchema.parse(row.collections) : null))
    .filter((c): c is Collection => c !== null && c.creator_id !== userId);

  return attachProgress(collections, userId);
}

export async function createCollection(input: CreateCollectionInput): Promise<Collection> {
  const { data, error } = await supabase
    .from('collections')
    .insert(input)
    .select('*')
    .single()
    .throwOnError();
  if (error) throw error;
  return CollectionSchema.parse(data);
}

// Single-item append for the camera "create on the fly" flow. Picks the next
// sort_order so it lands at the bottom of the existing list without a manual
// numbering step on the client. Anyone authenticated who owns or has joined
// the collection can call this — RLS in 011_user_added_items.sql enforces it.
export async function addCollectionItem(
  collectionId: string,
  input: CreateItemInput
): Promise<CollectionItem> {
  const { data: maxRow, error: maxErr } = await supabase
    .from('collection_items')
    .select('sort_order')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw maxErr;
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;
  const row: TablesInsert<'collection_items'> = {
    ...input,
    collection_id: collectionId,
    sort_order: nextOrder,
  };
  const { data, error } = await supabase
    .from('collection_items')
    .insert(row)
    .select('*')
    .single()
    .throwOnError();
  if (error) throw error;
  return CollectionItemSchema.parse(data);
}

export async function addCollectionItems(
  collectionId: string,
  items: CreateItemInput[]
): Promise<CollectionItem[]> {
  if (items.length === 0) return [];
  const rows: TablesInsert<'collection_items'>[] = items.map((item, index) => ({
    ...item,
    collection_id: collectionId,
    sort_order: index,
  }));
  const { data, error } = await supabase
    .from('collection_items')
    .insert(rows)
    .select('*')
    .throwOnError();
  if (error) throw error;
  return CollectionItemListSchema.parse(data ?? []);
}

export interface CollectionItemContext {
  collection: Collection;
  item: CollectionItem;
}

// Reverse of getCollection: takes an item id and returns it together with its
// parent collection. Used by CaptureResultSheet (verify mode) so the chips can
// render without two round-trips from the camera screen.
export async function getCollectionItemContext(itemId: string): Promise<CollectionItemContext> {
  const { data, error } = await supabase
    .from('collection_items')
    .select('*, collection:collections(*)')
    .eq('id', itemId)
    .single();
  if (error) throw error;
  if (!data || !data.collection) throw new Error('collection_item_not_found');
  const item = CollectionItemSchema.parse({ ...data, collection: undefined });
  const collection = CollectionSchema.parse(data.collection);
  return { collection, item };
}

// Copies a public collection (and all its items) under the calling user.
// Idempotent: a second call for the same source returns the existing fork.
// All work happens in the security-definer RPC fork_collection (see migration
// 016) — never insert collections + items by hand on the client, RLS won't
// allow reading items from a foreign collection during the copy step.
export async function forkCollection(sourceId: string): Promise<string> {
  const { data, error } = await supabase.rpc('fork_collection', {
    p_collection_id: sourceId,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('fork_collection: unexpected response shape');
  return data;
}

// True when the user already forked this source. Used to swap "Copy to me"
// for "Already in your collections" on Discover and the detail screen.
export async function isForkedByMe(sourceId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('collections')
    .select('id')
    .eq('forked_from', sourceId)
    .eq('creator_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function getCollection(id: string, userId: string): Promise<CollectionDetail> {
  const [collectionRes, itemsRes] = await Promise.all([
    supabase.from('collections').select('*').eq('id', id).single(),
    supabase
      .from('collection_items')
      .select('*')
      .eq('collection_id', id)
      .order('sort_order', { ascending: true }),
  ]);
  if (collectionRes.error) throw collectionRes.error;
  if (itemsRes.error) throw itemsRes.error;

  const collection = CollectionSchema.parse(collectionRes.data);
  const items = CollectionItemListSchema.parse(itemsRes.data ?? []);
  const itemIds = items.map((i) => i.id);

  let finds: Find[] = [];
  let referenceFinds: Find[] = [];
  if (itemIds.length > 0) {
    const queries = [
      supabase
        .from('finds')
        .select('*')
        .eq('user_id', userId)
        .in('collection_item_id', itemIds)
        .order('created_at', { ascending: false }),
    ];
    // Skip the second query when the viewer IS the creator — the first query
    // already covers it. Otherwise pull the creator's finds so non-owners see
    // the example shots in unfilled cells. RLS gates this for private
    // collections (returns []), which is the fallback we want anyway.
    if (collection.creator_id !== userId) {
      queries.push(
        supabase
          .from('finds')
          .select('*')
          .eq('user_id', collection.creator_id)
          .in('collection_item_id', itemIds)
          .order('created_at', { ascending: false })
      );
    }
    const [ownRes, refRes] = await Promise.all(queries);
    if (ownRes.error) throw ownRes.error;
    finds = FindListSchema.parse(ownRes.data ?? []);
    if (refRes) {
      if (refRes.error) throw refRes.error;
      referenceFinds = FindListSchema.parse(refRes.data ?? []);
    }
  }

  const foundItemIds = new Set(finds.map((f) => f.collection_item_id));

  let forkedFromTitle: string | null = null;
  if (collection.forked_from) {
    const { data: sourceRow, error: sourceErr } = await supabase
      .from('collections')
      .select('title')
      .eq('id', collection.forked_from)
      .maybeSingle();
    if (sourceErr) throw sourceErr;
    forkedFromTitle = (sourceRow?.title as string | undefined) ?? null;
  }

  return {
    ...collection,
    items: items.map((item) => ({ ...item, found: foundItemIds.has(item.id) })),
    finds,
    referenceFinds,
    forkedFromTitle,
  };
}
