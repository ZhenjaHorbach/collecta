import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

// Captures the off-screen card view to a temp PNG and hands it to the OS share
// sheet. Falls back to text+URL share when the device has no image-sharing
// surface (rare, but expo-sharing is unavailable on web).
export async function shareCardImage(
  ref: RefObject<View | null>,
  fallback: { message: string; url: string; dialogTitle?: string }
): Promise<void> {
  const node = ref.current;
  if (!node) {
    await fallbackShare(fallback);
    return;
  }
  try {
    const uri = await captureRef(node, { format: 'png', quality: 1, result: 'tmpfile' });
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      await fallbackShare(fallback);
      return;
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: fallback.dialogTitle,
      UTI: 'public.png',
    });
  } catch (e) {
    console.warn('[share] capture failed; falling back to text', e);
    await fallbackShare(fallback);
  }
}

async function fallbackShare(payload: {
  message: string;
  url: string;
  dialogTitle?: string;
}): Promise<void> {
  // iOS prefers `url`, Android folds it into `message`. Same shape as the
  // existing collection share in CollectionDetailScreen.
  await Share.share(
    Platform.OS === 'ios'
      ? { url: payload.url, message: payload.message }
      : { message: `${payload.message}\n${payload.url}` },
    { dialogTitle: payload.dialogTitle }
  );
}

// URL-only path for callers that don't have a captured card ready (e.g. the
// generic "share" button in the collection header). Centralised so the message
// formatting stays consistent across the app.
export async function shareUrl(payload: {
  message: string;
  url: string;
  dialogTitle?: string;
}): Promise<void> {
  await fallbackShare(payload);
}
