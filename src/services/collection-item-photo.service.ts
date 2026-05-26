import { inferUploadExtension, readBytes } from '@utils/files.utils';

import { supabase } from './supabase.service';

const BUCKET = 'collection-item-images';

export async function uploadCollectionItemPhoto(localUri: string, userId: string): Promise<string> {
  const ext = inferUploadExtension(localUri);
  const objectKey = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const bytes = await readBytes(localUri);

  const { error } = await supabase.storage.from(BUCKET).upload(objectKey, bytes, {
    contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectKey);
  return data.publicUrl;
}

function objectKeyFromPublicUrl(publicUrl: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  return i === -1 ? null : publicUrl.slice(i + marker.length);
}

// Returns true when the URL points at the caller's own folder in our bucket
// — used to decide whether a "replace" / "remove" should also delete the
// storage object. Mirrored AI-pipeline images (under the system user's
// folder) are shared across items and must NEVER be deleted by a single
// user's edit. External URLs (legacy rows that didn't go through the mirror)
// also live elsewhere and shouldn't be touched.
export function isOwnedCollectionItemPhoto(
  url: string | null | undefined,
  userId: string
): boolean {
  return Boolean(url) && url!.includes(`/${BUCKET}/${userId}/`);
}

export async function deleteCollectionItemPhoto(publicUrl: string): Promise<void> {
  const objectKey = objectKeyFromPublicUrl(publicUrl);
  if (!objectKey) return;
  const { error } = await supabase.storage.from(BUCKET).remove([objectKey]);
  if (error) throw error;
}
