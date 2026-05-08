// useSetting + readSetting + writeSetting share one MMKV-backed store.
// Tests pin: defaults are "feature on" (per .claude/rules/settings.md),
// reads return the stored value when present, writes persist + update
// the React state.

/* eslint-disable import/first */
const mockBackend = new Map<string, unknown>();

jest.mock('@services/storage.service', () => ({
  Storage: {
    get: <T>(key: string): T | undefined => mockBackend.get(key) as T | undefined,
    set: <T>(key: string, value: T): void => {
      mockBackend.set(key, value);
    },
  },
  StorageKeys: {
    prefAutoTagLocation: 'pref_auto_tag_location',
    prefAiVerification: 'pref_ai_verification',
    prefHighResUploads: 'pref_high_res_uploads',
    prefPushNotifications: 'pref_push_notifications',
  },
}));

import { act, renderHook } from '@testing-library/react-native';

import { SETTINGS, readSetting, useSetting, writeSetting } from '../useSetting';
/* eslint-enable import/first */

beforeEach(() => mockBackend.clear());

describe('SETTINGS defaults', () => {
  it('matches the documented defaults — "feature on" for the install-day toggles', () => {
    // Per settings.md, autoTagLocation / aiVerification / pushNotifications
    // default true so a fresh install behaves like the app did before
    // settings existed. highResUploads defaults false (data-cost opt-in).
    expect(SETTINGS.autoTagLocation.default).toBe(true);
    expect(SETTINGS.aiVerification.default).toBe(true);
    expect(SETTINGS.highResUploads.default).toBe(false);
    expect(SETTINGS.pushNotifications.default).toBe(true);
  });
});

describe('readSetting', () => {
  it('returns the default when no value is stored', () => {
    expect(readSetting('autoTagLocation')).toBe(true);
    expect(readSetting('highResUploads')).toBe(false);
  });

  it('returns the stored value when present', () => {
    mockBackend.set('pref_auto_tag_location', false);
    expect(readSetting('autoTagLocation')).toBe(false);
  });
});

describe('writeSetting', () => {
  it('persists to the storage key declared in SETTINGS', () => {
    writeSetting('aiVerification', false);
    expect(mockBackend.get('pref_ai_verification')).toBe(false);
  });
});

describe('useSetting', () => {
  it('initialises with the current stored value (or default if unset)', () => {
    mockBackend.set('pref_auto_tag_location', false);
    const { result } = renderHook(() => useSetting('autoTagLocation'));
    expect(result.current[0]).toBe(false);
  });

  it('updates state and persists when the setter is called', () => {
    const { result } = renderHook(() => useSetting('aiVerification'));
    expect(result.current[0]).toBe(true); // default

    act(() => {
      result.current[1](false);
    });
    expect(result.current[0]).toBe(false);
    expect(mockBackend.get('pref_ai_verification')).toBe(false);
  });
});
