// Web stub for collection-item-photo.service. The native implementation
// reads the picked image via expo-file-system/legacy, which doesn't exist
// in the web bundle. Editing/creating collections with photo uploads is
// native-only today; the screen is reachable on web but the upload buttons
// must not be wired there. Throwing keeps any accidental call loud instead
// of silently no-op'ing.

const BUCKET = 'collection-item-images';

export function uploadCollectionItemPhoto(_localUri: string, _userId: string): Promise<string> {
  return Promise.reject(new Error('uploadCollectionItemPhoto is not supported on web'));
}

export function isOwnedCollectionItemPhoto(
  url: string | null | undefined,
  userId: string
): boolean {
  return Boolean(url) && url!.includes(`/${BUCKET}/${userId}/`);
}

export function deleteCollectionItemPhoto(_publicUrl: string): Promise<void> {
  return Promise.reject(new Error('deleteCollectionItemPhoto is not supported on web'));
}
