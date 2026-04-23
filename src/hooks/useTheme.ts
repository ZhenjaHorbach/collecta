import { Storage } from '@services/storage.service';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

type Listener = (preference: ThemePreference) => void;

let currentPreference: ThemePreference = readStoredTheme();
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener(currentPreference);
}

export function getStoredTheme(): ThemePreference {
  return currentPreference;
}

export function useTheme() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(currentPreference);

  useEffect(() => {
    const listener: Listener = (next) => setPreferenceState(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    setColorScheme(preference);
  }, [preference, setColorScheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    Storage.set(THEME_STORAGE_KEY, next);
    currentPreference = next;
    notify();
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
