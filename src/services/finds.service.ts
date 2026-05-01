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
