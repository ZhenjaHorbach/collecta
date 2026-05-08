// useTheme bridges a module-level theme preference (system | dark | light)
// to nativewind's setColorScheme. The store is module-level by design (per
// useTheme.ts: writes propagate without a Provider) — these tests share
// state across cases.
//
// Note: hydration from MMKV happens once, at module-load. Testing that path
// requires module isolation that breaks react-test-renderer's React
// instance, so we don't cover it here — leaving Storage.get as a jest.fn
// that returns undefined gives the default 'system' branch.

/* eslint-disable import/first */
const mockSetColorScheme = jest.fn();
const nativewindState = {
  colorScheme: 'dark' as 'light' | 'dark' | null,
};

jest.mock('@services/storage.service', () => ({
  Storage: {
    get: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
  },
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({
    colorScheme: nativewindState.colorScheme,
    setColorScheme: mockSetColorScheme,
  }),
}));

import { act, renderHook } from '@testing-library/react-native';

import { Storage } from '@services/storage.service';

import { useTheme } from '../useTheme';
/* eslint-enable import/first */

beforeEach(() => {
  mockSetColorScheme.mockReset();
  nativewindState.colorScheme = 'dark';
  (Storage.set as jest.Mock).mockReset();
});

describe('useTheme', () => {
  it('exposes the canonical option set', () => {
    const { result } = renderHook(() => useTheme());
    expect([...result.current.options]).toEqual(['system', 'dark', 'light']);
  });

  it('falls back to "dark" when nativewind reports null colorScheme', () => {
    nativewindState.colorScheme = null;
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolved).toBe('dark');
  });

  it('forwards the resolved colorScheme as-is when nativewind has one', () => {
    nativewindState.colorScheme = 'light';
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolved).toBe('light');
  });

  it('setPreference persists to storage and updates the React state', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setPreference('light');
    });
    expect(Storage.set).toHaveBeenCalledWith('app_theme', 'light');
    expect(result.current.preference).toBe('light');
  });

  it('multiple consumers see the same updated preference (module-level store)', () => {
    const a = renderHook(() => useTheme());
    const b = renderHook(() => useTheme());
    act(() => {
      a.result.current.setPreference('dark');
    });
    expect(b.result.current.preference).toBe('dark');
  });

  it('forwards the new preference to nativewind via setColorScheme', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setPreference('system');
    });
    // The effect runs setColorScheme on every preference change.
    expect(mockSetColorScheme).toHaveBeenCalledWith('system');
  });
});
