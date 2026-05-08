// useMapFinds debounces viewport bounds before calling listFindsForMap.
// Tests pin: null bounds → no call, debounced call lands eventually,
// service errors don't propagate (silent loading=false).

/* eslint-disable import/first */
const mockListFindsForMap = jest.fn();
jest.mock('@services/finds.service', () => ({
  listFindsForMap: (...args: unknown[]) => mockListFindsForMap(...args),
}));

// use-debounce normally adds a delay; bypass in tests so we don't fight
// fake timers for every assertion.
jest.mock('use-debounce', () => ({
  useDebounce: <T>(value: T) => [value],
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { useMapFinds } from '../useMapFinds';
/* eslint-enable import/first */

beforeEach(() => mockListFindsForMap.mockReset());

// Stable reference — re-creating the bounds object every render would
// trigger the effect on every render and OOM in tests because the hook's
// dep array is `[debouncedBounds]`.
const BOUNDS = { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };

describe('useMapFinds', () => {
  it('does nothing when bounds are null', async () => {
    const { result } = renderHook(() => useMapFinds(null));
    expect(result.current.finds).toEqual([]);
    expect(mockListFindsForMap).not.toHaveBeenCalled();
  });

  it('fetches finds for the debounced viewport', async () => {
    mockListFindsForMap.mockResolvedValue([{ id: 'f1' }]);
    const { result } = renderHook(() => useMapFinds(BOUNDS));
    await waitFor(() => expect(result.current.finds).toEqual([{ id: 'f1' }]));
  });

  it('swallows service errors but still toggles loading off', async () => {
    mockListFindsForMap.mockRejectedValue(new Error('rls'));
    const { result } = renderHook(() => useMapFinds(BOUNDS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.finds).toEqual([]);
  });
});
