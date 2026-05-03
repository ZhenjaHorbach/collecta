import type { CollectionCategory } from '@constants/categories';
import { MAP_VIEWPORT_LIMIT } from '@constants/map';
import { FindSchema, type Find } from '@schemas';

import { supabase } from './supabase.service';

export interface CreateFindInput {
  userId: string;
  collectionItemId: string;
  photoUrl: string;
  locationLat?: number | null;
  locationLng?: number | null;
  notes?: string | null;
}

export async function createFind(input: CreateFindInput): Promise<Find> {
  const { data, error } = await supabase
    .from('finds')
    .insert({
      user_id: input.userId,
      collection_item_id: input.collectionItemId,
      photo_url: input.photoUrl,
      location_lat: input.locationLat ?? null,
      location_lng: input.locationLng ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return FindSchema.parse(data);
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
