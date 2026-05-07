import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { Storage } from '@services/storage.service';

export type ThemePreference = 'system' | 'dark' | 'light';

const THEME_STORAGE_KEY = 'app_theme';
const ALL_PREFERENCES: readonly ThemePreference[] = ['system', 'dark', 'light'];

function isPreference(value: string | undefined): value is ThemePreference {
  return !!value && (ALL_PREFERENCES as readonly string[]).includes(value);
}

function readStoredTheme(): ThemePreference {
  const saved = Storage.get<string>(THEME_STORAGE_KEY);
  return isPreference(saved) ? saved : 'system';
}

// Module-level store that backs every useTheme() consumer. Kept outside
// React state so theme writes from one screen propagate immediately to
// every other mounted component without a context provider. React
// Compiler refuses to optimise components that mutate module globals
// read during render — useSyncExternalStore is the canonical bridge:
// the hook reads via getSnapshot (no mutation) and gets re-rendered
// only when subscribe's listener fires.
let currentPreference: ThemePreference = readStoredTheme();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ThemePreference {
  return currentPreference;
}

function writePreference(next: ThemePreference): void {
  if (next === currentPreference) return;
  Storage.set(THEME_STORAGE_KEY, next);
  currentPreference = next;
  for (const listener of listeners) listener();
}

export function useTheme() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const preference = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    setColorScheme(preference);
  }, [preference, setColorScheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    writePreference(next);
  }, []);

  return useMemo(
    () => ({
      preference,
      resolved: (colorScheme ?? 'dark') as 'light' | 'dark',
      setPreference,
      options: ALL_PREFERENCES,
    }),
    [preference, colorScheme, setPreference]
  );
}
