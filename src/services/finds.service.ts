import type { CollectionCategory } from '@constants/categories';
import { MAP_VIEWPORT_LIMIT } from '@constants/map';
import { FindSchema, type Find } from '@schemas';

import { deleteFindPhoto } from './find-photo.service';
import { awardXp } from './gamification.service';
import { supabase } from './supabase.service';

export interface CreateFindInput {
  userId: string;
  collectionItemId: string;
  photoUrl: string;
  locationLat?: number | null;
  locationLng?: number | null;
  notes?: string | null;
  // Optional AI fields baked in at create time. Set when the user commits a
  // find that has already been validated by the edge function; left null when
  // the find predates validation (e.g. a future offline path).
  aiValidated?: boolean | null;
  aiConfidence?: number | null;
  aiNotes?: string | null;
  aiModel?: string | null;
  aiInputTokens?: number | null;
  aiOutputTokens?: number | null;
  aiCacheReadTokens?: number | null;
  aiCacheCreationTokens?: number | null;
}

export async function createFind(input: CreateFindInput): Promise<Find> {
  const payload = {
    photo_url: input.photoUrl,
    location_lat: input.locationLat ?? null,
    location_lng: input.locationLng ?? null,
    notes: input.notes ?? null,
    ai_validated: input.aiValidated ?? null,
    ai_confidence: input.aiConfidence ?? null,
    ai_notes: input.aiNotes ?? null,
    ai_model: input.aiModel ?? null,
    ai_input_tokens: input.aiInputTokens ?? null,
    ai_output_tokens: input.aiOutputTokens ?? null,
    ai_cache_read_tokens: input.aiCacheReadTokens ?? null,
    ai_cache_creation_tokens: input.aiCacheCreationTokens ?? null,
  };

  // One find per (user, collection_item) — see migration 009. A re-photo
  // updates the existing row instead of creating a second pin on the map.
  const { data: existing } = await supabase
    .from('finds')
    .select('id, photo_url')
    .eq('user_id', input.userId)
    .eq('collection_item_id', input.collectionItemId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('finds')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;

    // Old photo becomes orphan storage; best-effort cleanup. Skipped when
    // the URL didn't change (defensive — shouldn't happen since uploads
    // always mint a new key).
    if (existing.photo_url && existing.photo_url !== input.photoUrl) {
      void deleteFindPhoto(existing.photo_url).catch((e) =>
        console.warn('[finds] orphan photo cleanup', e)
      );
    }
    // XP and streak were already counted on the first save, but re-run the
    // achievement matcher: an unlock might have been missed if the agent
    // call failed earlier, or if the user joined a new collection between
    // saves and only now qualifies for `first_collection_complete`.
    void awardXp(input.userId, 'recheck');
    return FindSchema.parse(data);
  }

  const { data, error } = await supabase
    .from('finds')
    .insert({
      user_id: input.userId,
      collection_item_id: input.collectionItemId,
      ...payload,
    })
    .select()
    .single();
  if (error) throw error;
  const find = FindSchema.parse(data);
  // Fire-and-forget: gamification must not block the find save. The agent
  // loop (XP + achievement checks) runs server-side and emits toasts via the
  // achievement-toast bus.
  void awardXp(input.userId, 'find');
  return find;
}

export interface MapFind {
  id: string;
  lat: number;
  lng: number;
  photoUrl: string;
  collectionId: string;
  collectionTitle: string;
  collectionEmoji: string | null;
  category: CollectionCategory;
  itemName: string;
  createdAt: string;
}

export interface ViewportBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface MapFindRow {
  id: string;
  photo_url: string;
  location_lat: number;
  location_lng: number;
  created_at: string;
  collection_items: {
    name: string;
    collections: {
      id: string;
      title: string;
      icon: string | null;
      category: CollectionCategory;
    } | null;
  } | null;
}

function mapFindRowTo(row: MapFindRow): MapFind | null {
  const collection = row.collection_items?.collections;
  if (!collection) return null;
  return {
    id: row.id,
    lat: row.location_lat,
    lng: row.location_lng,
    photoUrl: row.photo_url,
    collectionId: collection.id,
    collectionTitle: collection.title,
    collectionEmoji: collection.icon,
    category: collection.category,
    itemName: row.collection_items?.name ?? '',
    createdAt: row.created_at,
  };
}

export interface FindDetail {
  find: Find;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    level: number | null;
  };
  collection: {
    id: string;
    title: string;
    icon: string | null;
    category: CollectionCategory | null;
  };
  item: {
    id: string;
    name: string;
  };
}

interface FindDetailRow {
  id: string;
  user_id: string;
  collection_item_id: string;
  photo_url: string;
  ai_validated: boolean | null;
  ai_confidence: number | null;
  ai_notes: string | null;
  notes: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  users: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    level: number | null;
  } | null;
  collection_items: {
    id: string;
    name: string;
    collections: {
      id: string;
      title: string;
      icon: string | null;
      category: CollectionCategory | null;
    } | null;
  } | null;
}

export async function getFindById(id: string): Promise<FindDetail> {
  const { data, error } = await supabase
    .from('finds')
    .select(
      `
      id, user_id, collection_item_id, photo_url,
      ai_validated, ai_confidence, ai_notes, notes,
      location_lat, location_lng, created_at,
      users ( id, username, display_name, avatar_url, level ),
      collection_items (
        id, name,
        collections ( id, title, icon, category )
      )
    `
    )
    .eq('id', id)
    .single<FindDetailRow>();
  if (error) throw error;
  if (!data) throw new Error('find_not_found');
  const collection = data.collection_items?.collections;
  const item = data.collection_items;
  const creator = data.users;
  if (!collection || !item || !creator) throw new Error('find_not_found');

  const find = FindSchema.parse({
    id: data.id,
    user_id: data.user_id,
    collection_item_id: data.collection_item_id,
    photo_url: data.photo_url,
    ai_validated: data.ai_validated,
    ai_confidence: data.ai_confidence,
    ai_notes: data.ai_notes,
    notes: data.notes,
    location_lat: data.location_lat,
    location_lng: data.location_lng,
    created_at: data.created_at,
  });

  return {
    find,
    creator: {
      id: creator.id,
      username: creator.username,
      displayName: creator.display_name,
      avatarUrl: creator.avatar_url,
      level: creator.level ?? null,
    },
    collection: {
      id: collection.id,
      title: collection.title,
      icon: collection.icon,
      category: collection.category,
    },
    item: { id: item.id, name: item.name },
  };
}

export async function listFindsForMap(
  bounds: ViewportBounds,
  limit = MAP_VIEWPORT_LIMIT
): Promise<MapFind[]> {
  const { data, error } = await supabase
    .from('finds')
    .select(
      `
      id,
      photo_url,
      location_lat,
      location_lng,
      created_at,
      collection_items (
        name,
        collections ( id, title, icon, category )
      )
    `
    )
    .not('location_lat', 'is', null)
    .not('location_lng', 'is', null)
    .gte('location_lat', bounds.minLat)
    .lte('location_lat', bounds.maxLat)
    .gte('location_lng', bounds.minLng)
    .lte('location_lng', bounds.maxLng)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<MapFindRow[]>();

  if (error) throw error;
  return (data ?? []).map(mapFindRowTo).filter((f): f is MapFind => f !== null);
}
