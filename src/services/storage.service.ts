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
} as const;
