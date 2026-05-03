import { useCallback, useEffect, useState } from 'react';

import { Storage, StorageKeys } from '@services/storage.service';

// Active collection for the camera viewfinder chip — persisted in mmkv so the
// user's "I'm out hunting Soviet mosaics today" choice survives backgrounding.
// Independent of the verify entry-point: opening the camera with
// ?collection_item_id=… does NOT touch this value.
export function useActiveCollection() {
  const [activeCollectionId, setId] = useState<string | null>(() => {
    return Storage.get<string>(StorageKeys.activeCollectionId) ?? null;
  });

  // No subscriptions — mmkv is synchronous, single-process. If a future
  // tab/screen also needs to read this, lift the state into a small
  // event-emitter or react-query store rather than re-reading on every
  // render.
  useEffect(() => {
    if (activeCollectionId) {
      Storage.set(StorageKeys.activeCollectionId, activeCollectionId);
    } else {
      Storage.delete(StorageKeys.activeCollectionId);
    }
  }, [activeCollectionId]);

  const setActive = useCallback((id: string | null) => {
    setId(id);
  }, []);

  return { activeCollectionId, setActive };
}
