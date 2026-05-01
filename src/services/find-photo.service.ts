import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from './supabase.service';

const BUCKET = 'finds-photos';

function decodeBase64(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export async function uploadFindPhoto(localUri: string, userId: string): Promise<string> {
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
