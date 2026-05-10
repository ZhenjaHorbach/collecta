import { readBytes } from '@utils/files.utils';

import { supabase } from './supabase.service';

const BUCKET = 'finds-photos';

export async function uploadFindPhoto(localUri: string, userId: string): Promise<string> {
  const ext = localUri.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
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

// Recovers the storage object key (`<userId>/<filename>`) from a publicUrl
// produced by uploadFindPhoto. Returns null if the URL doesn't match the
// expected bucket prefix.
function objectKeyFromPublicUrl(publicUrl: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  return i === -1 ? null : publicUrl.slice(i + marker.length);
}

// Used to clean up an uploaded photo that the user did not commit
// (Retake / blur-after-validation). Storage RLS allows the owner to delete.
export async function deleteFindPhoto(publicUrl: string): Promise<void> {
  const objectKey = objectKeyFromPublicUrl(publicUrl);
  if (!objectKey) return;
  const { error } = await supabase.storage.from(BUCKET).remove([objectKey]);
  if (error) throw error;
}
