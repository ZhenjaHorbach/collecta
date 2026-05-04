import { useCallback, useState } from 'react';

import { Storage, StorageKeys } from '@services/storage.service';

// User preferences exposed in SettingsScreen. Defaults are intentionally
// "feature on" so a fresh install behaves like the app did before settings
// existed. Reading via the hook subscribes to React state; reading via
// `readSetting` is for non-React callsites (services, hooks at module-init).
export const SETTINGS = {
  autoTagLocation: { key: StorageKeys.prefAutoTagLocation, default: true },
  aiVerification: { key: StorageKeys.prefAiVerification, default: true },
  highResUploads: { key: StorageKeys.prefHighResUploads, default: false },
} as const satisfies Record<string, { key: string; default: boolean }>;

export type SettingName = keyof typeof SETTINGS;

export function readSetting(name: SettingName): boolean {
  const meta = SETTINGS[name];
  const stored = Storage.get<boolean>(meta.key);
  return stored ?? meta.default;
}

export function writeSetting(name: SettingName, value: boolean): void {
  Storage.set(SETTINGS[name].key, value);
}

// Single-process app, single-writer settings — no MMKV listener needed for
// cross-screen sync. Components that toggle the setting also own the local
// state, and any reader instance picks up the latest value on mount via the
// lazy `useState` initializer.
export function useSetting(name: SettingName): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => readSetting(name));

  const set = useCallback(
    (next: boolean): void => {
      writeSetting(name, next);
      setValue(next);
    },
    [name]
  );

  return [value, set];
}
