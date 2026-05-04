import type { CollectionCategory } from '@constants/categories';

import { supabase } from './supabase.service';

export interface FeedItem {
  findId: string;
  userId: string;
  collectionId: string;
  collectionItemId: string;
  collectionTitle: string;
  collectionIcon: string | null;
  collectionCategory: CollectionCategory | null;
  itemName: string;
  photoUrl: string;
  locationLat: number | null;
  locationLng: number | null;
  notes: string | null;
  createdAt: string;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  creatorAvatarUrl: string | null;
  score: number;
  sharedCollections: number;
  geoScore: number;
  reactionsCount: number;
}

export interface ListFeedParams {
  viewerLat: number | null;
  viewerLng: number | null;
  pageSize?: number;
  pageOffset?: number;
}

interface FeedJoinRow {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

interface CollectionJoinRow {
  id: string;
  title: string;
  icon: string | null;
  category: CollectionCategory | null;
}

interface CollectionItemJoinRow {
  id: string;
  name: string;
}

// The RPC returns a flat list ranked by score. We hydrate each row with
// creator + collection details in a second batched query — RPC stays a single
// aggregate-friendly statement, while joins live in the client where the
// generated types already cover them.
export async function listFeed(params: ListFeedParams): Promise<FeedItem[]> {
  const { data: rpcRows, error: rpcErr } = await supabase.rpc('get_personalized_feed', {
    viewer_lat: params.viewerLat,
    viewer_lng: params.viewerLng,
    page_size: params.pageSize ?? 20,
    page_offset: params.pageOffset ?? 0,
  });
  if (rpcErr) throw rpcErr;
  if (!rpcRows || rpcRows.length === 0) return [];

  const userIds = Array.from(new Set(rpcRows.map((r) => r.user_id)));
  const collectionIds = Array.from(new Set(rpcRows.map((r) => r.collection_id)));
  const itemIds = Array.from(new Set(rpcRows.map((r) => r.collection_item_id)));

  const [
    { data: users, error: usersErr },
    { data: collections, error: colsErr },
    { data: items, error: itemsErr },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, display_name, username, avatar_url')
      .in('id', userIds)
      .returns<FeedJoinRow[]>(),
    supabase
      .from('collections')
      .select('id, title, icon, category')
      .in('id', collectionIds)
      .returns<CollectionJoinRow[]>(),
    supabase
      .from('collection_items')
      .select('id, name')
      .in('id', itemIds)
      .returns<CollectionItemJoinRow[]>(),
  ]);

  if (usersErr) throw usersErr;
  if (colsErr) throw colsErr;
  if (itemsErr) throw itemsErr;

  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const collectionById = new Map((collections ?? []).map((c) => [c.id, c]));
  const itemById = new Map((items ?? []).map((i) => [i.id, i]));

  return rpcRows
    .map<FeedItem | null>((r) => {
      const u = userById.get(r.user_id);
      const c = collectionById.get(r.collection_id);
      const i = itemById.get(r.collection_item_id);
      if (!u || !c || !i) return null;
      return {
        findId: r.find_id,
        userId: r.user_id,
        collectionId: r.collection_id,
        collectionItemId: r.collection_item_id,
        collectionTitle: c.title,
        collectionIcon: c.icon,
        collectionCategory: c.category,
        itemName: i.name,
        photoUrl: r.photo_url,
        locationLat: r.location_lat,
        locationLng: r.location_lng,
        notes: r.notes,
        createdAt: r.created_at,
        creatorId: u.id,
        creatorUsername: u.username,
        creatorDisplayName: u.display_name,
        creatorAvatarUrl: u.avatar_url,
        score: r.score,
        sharedCollections: r.shared_collections,
        geoScore: r.geo_score,
        reactionsCount: r.reactions_count,
      };
    })
    .filter((f): f is FeedItem => f !== null);
}
