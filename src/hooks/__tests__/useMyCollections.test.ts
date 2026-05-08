// useMyCollections fans out two listings (mine + pickedUp) and folds them
// into a single state machine. Tests pin: no user → empty + not loading,
// successful Promise.all → both lists in state, refetch clears errors.

/* eslint-disable import/first */
const mockListMine = jest.fn();
const mockListPickedUp = jest.fn();
jest.mock('@services/collections.service', () => ({
  listMyCollections: (...args: unknown[]) => mockListMine(...args),
  listPickedUpCollections: (...args: unknown[]) => mockListPickedUp(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('@hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    React.useEffect(cb, [cb]);
  },
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { useMyCollections } from '../useMyCollections';
/* eslint-enable import/first */

beforeEach(() => {
  mockListMine.mockReset();
  mockListPickedUp.mockReset();
  mockUseAuth.mockReset();
});

describe('useMyCollections', () => {
  it('returns empty + not-loading when there is no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useMyCollections());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mine).toEqual([]);
    expect(result.current.pickedUp).toEqual([]);
    expect(mockListMine).not.toHaveBeenCalled();
  });

  it('runs both listings in parallel and merges into state', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockListMine.mockResolvedValue([{ id: 'm1' }]);
    mockListPickedUp.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    const { result } = renderHook(() => useMyCollections());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mine).toEqual([{ id: 'm1' }]);
    expect(result.current.pickedUp).toHaveLength(2);
  });

  it('captures errors from either listing', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockListMine.mockResolvedValue([]);
    mockListPickedUp.mockRejectedValue(new Error('rls'));
    const { result } = renderHook(() => useMyCollections());
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.mine).toEqual([]);
    expect(result.current.pickedUp).toEqual([]);
  });
});
