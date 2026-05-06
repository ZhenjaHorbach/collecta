// Read-only service for the Discover screen. Wraps the
// rpc_discover_collections RPC (migration 018) — keeps the per-card
// forks_count and forked_by_me flag on the same trip as the collection
// metadata. Non-RPC fallback would need three round-trips (collections +
// fork counts + per-viewer fork lookup), so always go via the RPC.

import type { CollectionCategory } from '@constants/categories';

import { supabase } from './supabase.service';

export type DiscoverSort = 'popular' | 'new';

export interface DiscoverCollection {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  cover_image_url: string | null;
  category: CollectionCategory | null;
  is_featured: boolean;
  creator_id: string;
  created_at: string;
  forks_count: number;
  items_count: number;
  forked_by_me: boolean;
}

export interface DiscoverFilter {
  category?: CollectionCategory | null;
  query?: string | null;
  sort?: DiscoverSort;
  limit?: number;
  offset?: number;
}

export async function listDiscoverCollections(
  filter: DiscoverFilter = {}
): Promise<DiscoverCollection[]> {
  const { data, error } = await supabase.rpc('rpc_discover_collections', {
    p_category: filter.category ?? null,
    p_query: filter.query?.trim() ? filter.query.trim() : null,
    p_sort: filter.sort ?? 'popular',
    p_limit: filter.limit ?? 50,
    p_offset: filter.offset ?? 0,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    cover_image_url: row.cover_image_url,
    category: (row.category as CollectionCategory | null) ?? null,
    is_featured: row.is_featured,
    creator_id: row.creator_id,
    created_at: row.created_at,
    // forks_count comes back as bigint → number in supabase-js, but the
    // generated type is number already. Coerce defensively.
    forks_count: Number(row.forks_count),
    items_count: row.items_count,
    forked_by_me: row.forked_by_me,
  }));
}
