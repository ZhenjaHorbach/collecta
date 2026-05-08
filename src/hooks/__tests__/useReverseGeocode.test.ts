// useReverseGeocode: cache hit → instant label, miss → expo-location call
// → cache write. Null coords short-circuit. Tests pin those branches; the
// label-building helper isn't a public export, so we exercise it via the
// hook's output shape.

/* eslint-disable import/first */
const mockReadCache = jest.fn();
const mockWriteCache = jest.fn();
const mockReverseGeocodeAsync = jest.fn();

jest.mock('@utils/geocode.utils', () => ({
  readGeocodeCache: (...args: unknown[]) => mockReadCache(...args),
  writeGeocodeCache: (...args: unknown[]) => mockWriteCache(...args),
}));

jest.mock('expo-location', () => ({
  reverseGeocodeAsync: (...args: unknown[]) => mockReverseGeocodeAsync(...args),
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { useReverseGeocode } from '../useReverseGeocode';
/* eslint-enable import/first */

beforeEach(() => {
  mockReadCache.mockReset();
  mockWriteCache.mockReset();
  mockReverseGeocodeAsync.mockReset();
});

describe('useReverseGeocode', () => {
  it('does not call expo-location when coords are null', () => {
    const { result } = renderHook(() => useReverseGeocode(null, null));
    expect(result.current.label).toBeNull();
    expect(mockReverseGeocodeAsync).not.toHaveBeenCalled();
  });

  it('returns the cached label without hitting expo-location', () => {
    mockReadCache.mockReturnValue('Warsaw');
    const { result } = renderHook(() => useReverseGeocode(52.23, 21.01));
    expect(result.current.label).toBe('Warsaw');
    expect(mockReverseGeocodeAsync).not.toHaveBeenCalled();
  });

  it('queries expo-location on cache miss and caches the result', async () => {
    mockReadCache.mockReturnValue(null);
    mockReverseGeocodeAsync.mockResolvedValue([{ name: '12', street: 'Main St', city: 'Warsaw' }]);
    const { result } = renderHook(() => useReverseGeocode(52.23, 21.01));
    await waitFor(() => expect(result.current.label).toMatch(/Warsaw/));
    expect(mockWriteCache).toHaveBeenCalledWith(52.23, 21.01, expect.any(String));
  });
});
