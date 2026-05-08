import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'collecta' });

export const Storage = {
  get<T>(key: string): T | undefined {
    const value = storage.getString(key);
    if (value === undefined) return undefined;
    return JSON.parse(value) as T;
  },

  set<T>(key: string, value: T): void {
    storage.set(key, JSON.stringify(value));
  },

  delete(key: string): void {
    storage.remove(key);
  },

  clear(): void {
    storage.clearAll();
  },
} as const;

// Typed keys — add here as needed
export const StorageKeys = {
  onboardingDone: 'onboarding_done',
  lastSyncedAt: 'last_synced_at',
  draftFind: 'draft_find',
  activeCollectionId: 'active_collection_id',
  // User preferences (SettingsScreen toggles). Defaults live next to the
  // useSetting hook so the consuming code reads a single source of truth.
  prefAutoTagLocation: 'pref_auto_tag_location',
  prefAiVerification: 'pref_ai_verification',
  prefHighResUploads: 'pref_high_res_uploads',
  prefPushNotifications: 'pref_push_notifications',
} as const;
