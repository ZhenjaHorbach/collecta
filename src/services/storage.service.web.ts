// Web implementation of storage.service — uses localStorage instead of MMKV

const storage = {
  getString: (key: string): string | undefined => localStorage.getItem(key) ?? undefined,
  set: (key: string, value: string): void => localStorage.setItem(key, value),
  remove: (key: string): void => localStorage.removeItem(key),
  clearAll: (): void => localStorage.clear(),
};

export { storage };

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

export const StorageKeys = {
  onboardingDone: 'onboarding_done',
  lastSyncedAt: 'last_synced_at',
  draftFind: 'draft_find',
} as const;
