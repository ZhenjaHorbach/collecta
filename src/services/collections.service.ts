import type { Tables } from '@typings/database';

import { supabase } from './supabase.service';

export type Collection = Tables<'collections'>;
export type CollectionItem = Tables<'collection_items'>;
export type Find = Tables<'finds'>;

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
  return attachProgress(data ?? [], userId);
}

export async function listPickedUpCollections(userId: string): Promise<CollectionWithProgress[]> {
  const { data, error } = await supabase
    .from('user_collections')
    .select('collections(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });
  if (error) throw error;

  const collections = (data ?? [])
    .map((row) => row.collections as Collection | null)
    .filter((c): c is Collection => c !== null && c.creator_id !== userId);

  return attachProgress(collections, userId);
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

  const items = itemsRes.data ?? [];
  const itemIds = items.map((i) => i.id);

  let finds: Find[] = [];
  if (itemIds.length > 0) {
    const { data: findsData, error: findsErr } = await supabase
      .from('finds')
      .select('*')
      .eq('user_id', userId)
      .in('collection_item_id', itemIds)
      .order('created_at', { ascending: false });
    if (findsErr) throw findsErr;
    finds = findsData ?? [];
  }

  const foundItemIds = new Set(finds.map((f) => f.collection_item_id));

  return {
    ...collectionRes.data,
    items: items.map((item) => ({ ...item, found: foundItemIds.has(item.id) })),
    finds,
  };
}
