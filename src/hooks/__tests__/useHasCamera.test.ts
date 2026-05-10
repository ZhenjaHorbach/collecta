// useHasCamera: native shortcut, web touch+videoinput probe, and failure
// modes (no mediaDevices, fine pointer, no videoinput, enumerate rejects).

/* eslint-disable import/first */
const mockEnumerateDevices = jest.fn();
const mockPlatformState = { OS: 'web' as 'web' | 'ios' | 'android' };
const mockMatchMediaState = { coarse: true };

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatformState.OS;
    },
  },
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { useHasCamera } from '../useHasCamera';
/* eslint-enable import/first */

beforeEach(() => {
  mockEnumerateDevices.mockReset();
  mockPlatformState.OS = 'web';
  mockMatchMediaState.coarse = true;
  Object.defineProperty(globalThis, 'navigator', {
    value: { mediaDevices: { enumerateDevices: mockEnumerateDevices } },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: {
      matchMedia: (query: string) => ({
        matches: query.includes('coarse') ? mockMatchMediaState.coarse : false,
      }),
    },
    configurable: true,
  });
});

describe('useHasCamera', () => {
  it('returns true synchronously on native', () => {
    mockPlatformState.OS = 'ios';
    const { result } = renderHook(() => useHasCamera());
    expect(result.current).toBe(true);
    expect(mockEnumerateDevices).not.toHaveBeenCalled();
  });

  it('returns null until the web probe resolves, then true with a videoinput', async () => {
    mockEnumerateDevices.mockResolvedValue([{ kind: 'audioinput' }, { kind: 'videoinput' }]);
    const { result } = renderHook(() => useHasCamera());
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('resolves to false when no videoinput is reported', async () => {
    mockEnumerateDevices.mockResolvedValue([{ kind: 'audioinput' }]);
    const { result } = renderHook(() => useHasCamera());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('returns false on a laptop (fine pointer) even with a webcam present', () => {
    mockMatchMediaState.coarse = false;
    mockEnumerateDevices.mockResolvedValue([{ kind: 'videoinput' }]);
    const { result } = renderHook(() => useHasCamera());
    expect(result.current).toBe(false);
    expect(mockEnumerateDevices).not.toHaveBeenCalled();
  });

  it('resolves to false when enumerateDevices rejects', async () => {
    mockEnumerateDevices.mockRejectedValue(new Error('blocked'));
    const { result } = renderHook(() => useHasCamera());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('returns false when navigator.mediaDevices is unavailable', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
    });
    const { result } = renderHook(() => useHasCamera());
    expect(result.current).toBe(false);
  });
});
