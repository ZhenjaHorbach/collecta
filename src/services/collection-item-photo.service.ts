import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from './supabase.service';

const BUCKET = 'collection-item-images';

function decodeBase64(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export async function uploadCollectionItemPhoto(localUri: string, userId: string): Promise<string> {
  const ext = localUri.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const objectKey = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = decodeBase64(base64);

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

// Returns true when the URL points at our bucket — used to decide whether
// a "replace" / "remove" should also delete the storage object. URLs from
// the AI pipeline (Wikipedia / Unsplash) live elsewhere and must not be
// touched.
export function isOwnedCollectionItemPhoto(url: string | null | undefined): boolean {
  return Boolean(url) && url!.includes(`/${BUCKET}/`);
}

export async function deleteCollectionItemPhoto(publicUrl: string): Promise<void> {
  const objectKey = objectKeyFromPublicUrl(publicUrl);
  if (!objectKey) return;
  const { error } = await supabase.storage.from(BUCKET).remove([objectKey]);
  if (error) throw error;
}
