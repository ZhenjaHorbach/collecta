// useDiscover wraps listDiscoverCollections + useFocusEffect. Tests pin:
// idempotent state machine (idle → loading → success/error), filter args
// pass through to the service, refetch re-runs the load.

/* eslint-disable import/first */
const mockListDiscover = jest.fn();
jest.mock('@services/discover.service', () => ({
  listDiscoverCollections: (...args: unknown[]) => mockListDiscover(...args),
}));

// useFocusEffect is from expo-router and behaves like useEffect during tests.
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    React.useEffect(cb, [cb]);
  },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDiscover } from '../useDiscover';
/* eslint-enable import/first */

beforeEach(() => mockListDiscover.mockReset());

describe('useDiscover', () => {
  it('starts loading and resolves to data on success', async () => {
    mockListDiscover.mockResolvedValue([{ id: 'c1', title: 'Doors' }]);
    const { result } = renderHook(() =>
      useDiscover({ category: null, query: '', sort: 'popular' })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ id: 'c1', title: 'Doors' }]);
    expect(result.current.error).toBeNull();
  });

  it('forwards filter args to the service', async () => {
    mockListDiscover.mockResolvedValue([]);
    renderHook(() => useDiscover({ category: 'urban', query: 'doors', sort: 'new' }));
    await waitFor(() =>
      expect(mockListDiscover).toHaveBeenCalledWith({
        category: 'urban',
        query: 'doors',
        sort: 'new',
      })
    );
  });

  it('captures errors and clears data', async () => {
    mockListDiscover.mockRejectedValue(new Error('rls'));
    const { result } = renderHook(() =>
      useDiscover({ category: null, query: '', sort: 'popular' })
    );
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('refetch re-runs the service call', async () => {
    mockListDiscover.mockResolvedValue([]);
    const { result } = renderHook(() =>
      useDiscover({ category: null, query: '', sort: 'popular' })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockListDiscover.mockClear();
    await act(async () => {
      await result.current.refetch();
    });
    expect(mockListDiscover).toHaveBeenCalledTimes(1);
  });
});
