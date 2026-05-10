import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Cross-platform photo IO. Web URIs from the picker / canvas / camera are
// blob:/data: URLs and don't go through FileSystem (`documentDirectory` is
// undefined and `readAsStringAsync` / `copyAsync` are unavailable). Native
// goes through the file system as before.

function decodeBase64(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

// Infer the upload extension from a URI. `blob:` and `data:` URIs (web)
// don't carry a path-based extension — `split('.').pop()` happens to fall
// through to JPEG for them, but only by accident. Be explicit so the
// behaviour doesn't break if the input format ever changes.
//
// `compressImage` on web always encodes JPEG, so `jpg` is the right
// fallback for opaque URIs. Native paths still carry .jpg/.png suffixes.
export function inferUploadExtension(localUri: string): 'png' | 'jpg' {
  if (localUri.startsWith('blob:') || localUri.startsWith('data:')) return 'jpg';
  return localUri.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
}

// Read the bytes behind `localUri` as a Uint8Array, ready for upload.
//
// Web: fetch the blob:/data: URL and copy its arrayBuffer. Blob URLs from
// `compressImage` would otherwise leak until page unload — `readBytes` is
// the last consumer of the URI in the upload pipeline, so we revoke here.
// Native: read the file as base64 + decode (FileSystem.readAsStringAsync).
export async function readBytes(localUri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    try {
      const response = await fetch(localUri);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } finally {
      if (localUri.startsWith('blob:') && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(localUri);
      }
    }
  }
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return decodeBase64(base64);
}

// Promote a transient photo URI (e.g. expo-camera takePictureAsync result,
// or expo-image-picker asset) to a stable URI the rest of the capture
// pipeline can rely on across re-renders.
//
// Web: blob:/data: URIs are already stable for the synchronous flow that
// follows. Copy is a no-op.
// Native: copy to the app's document directory so the URI survives picker
// cleanup.
export async function persistTempPhoto(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  const dest = `${FileSystem.documentDirectory}photo_${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}
