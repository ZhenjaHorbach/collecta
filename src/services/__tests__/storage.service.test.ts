// storage.service smoke: Storage.get/set round-trip JSON, undefined for
// missing keys, StorageKeys constants are stable. Underlying MMKV is mocked
// (jest-expo runs in Node — no native module).

/* eslint-disable import/first */
const mockBackend = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (k: string): string | undefined => mockBackend.get(k),
    set: (k: string, v: string): void => {
      mockBackend.set(k, v);
    },
    remove: (k: string): void => {
      mockBackend.delete(k);
    },
    clearAll: (): void => mockBackend.clear(),
  }),
}));

import { Storage, StorageKeys } from '../storage.service';
/* eslint-enable import/first */

beforeEach(() => mockBackend.clear());

describe('Storage', () => {
  it('returns undefined for an unknown key', () => {
    expect(Storage.get('nope')).toBeUndefined();
  });

  it('round-trips primitives via JSON', () => {
    Storage.set('s', 'hello');
    Storage.set('n', 42);
    Storage.set('b', true);
    expect(Storage.get<string>('s')).toBe('hello');
    expect(Storage.get<number>('n')).toBe(42);
    expect(Storage.get<boolean>('b')).toBe(true);
  });

  it('round-trips objects and arrays', () => {
    const value = { items: [1, 2, 3], meta: { tag: 'x' } };
    Storage.set('o', value);
    expect(Storage.get<typeof value>('o')).toEqual(value);
  });

  it('delete removes the key', () => {
    Storage.set('k', 'v');
    Storage.delete('k');
    expect(Storage.get('k')).toBeUndefined();
  });

  it('clear empties everything', () => {
    Storage.set('a', 1);
    Storage.set('b', 2);
    Storage.clear();
    expect(Storage.get('a')).toBeUndefined();
    expect(Storage.get('b')).toBeUndefined();
  });
});

describe('StorageKeys', () => {
  it('exposes the documented preference keys with `pref` prefix', () => {
    // Per .claude/rules/settings.md: prefs are namespaced with `pref_*`.
    // Renaming a key without a migration silently resets the user's
    // preference — this fence test catches that diff.
    expect(StorageKeys.prefAutoTagLocation).toBe('pref_auto_tag_location');
    expect(StorageKeys.prefAiVerification).toBe('pref_ai_verification');
    expect(StorageKeys.prefHighResUploads).toBe('pref_high_res_uploads');
    expect(StorageKeys.prefPushNotifications).toBe('pref_push_notifications');
  });

  it('exposes runtime state keys', () => {
    expect(StorageKeys.onboardingDone).toBe('onboarding_done');
    expect(StorageKeys.activeCollectionId).toBe('active_collection_id');
    expect(StorageKeys.draftFind).toBe('draft_find');
    expect(StorageKeys.lastSyncedAt).toBe('last_synced_at');
  });
});
