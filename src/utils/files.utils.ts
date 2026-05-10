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

// Read the bytes behind `localUri` as a Uint8Array, ready for upload.
//
// Web: fetch the blob:/data: URL and copy its arrayBuffer.
// Native: read the file as base64 + decode (FileSystem.readAsStringAsync).
export async function readBytes(localUri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const response = await fetch(localUri);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
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
