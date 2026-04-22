// Web implementation of storage.service — uses localStorage in the browser,
// falls back to an in-memory map during SSR (Expo Router static rendering
// runs this file in Node.js, where `localStorage` is undefined).

const memory = new Map<string, string>();

const storage =
  typeof localStorage !== 'undefined'
    ? {
        getString: (key: string): string | undefined => localStorage.getItem(key) ?? undefined,
        set: (key: string, value: string): void => localStorage.setItem(key, value),
        remove: (key: string): void => localStorage.removeItem(key),
        clearAll: (): void => localStorage.clear(),
      }
    : {
        getString: (key: string): string | undefined => memory.get(key),
        set: (key: string, value: string): void => {
          memory.set(key, value);
        },
        remove: (key: string): void => {
          memory.delete(key);
        },
        clearAll: (): void => {
          memory.clear();
        },
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
