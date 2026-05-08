// Smoke: client constructs without throwing, exposes auth + from + functions
// surfaces. We mock react-native-mmkv via the storage tests' pattern so the
// MMKV-backed auth storage in supabase.service can boot in jest's node env.

// jest.setup.ts seeds EXPO_PUBLIC_* env vars before module imports.

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
    clearAll: (): void => {
      mockBackend.clear();
    },
  }),
}));

import { supabase } from '../supabase.service';
/* eslint-enable import/first */

describe('supabase client', () => {
  it('exposes the auth, from, and functions surfaces', () => {
    expect(typeof supabase.auth.getSession).toBe('function');
    expect(typeof supabase.from).toBe('function');
    expect(typeof supabase.functions.invoke).toBe('function');
    expect(typeof supabase.storage.from).toBe('function');
  });
});
