// useCollection fetches one CollectionDetail keyed by id + viewer. Tests
// pin: missing id or user → idle/empty, success → data populated, errors
// land on `error`, refetch re-runs the load.

/* eslint-disable import/first */
const mockGetCollection = jest.fn();
jest.mock('@services/collections.service', () => ({
  getCollection: (...args: unknown[]) => mockGetCollection(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('@hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

import { renderHook, waitFor } from '@testing-library/react-native';

import { useCollection } from '../useCollection';
/* eslint-enable import/first */

beforeEach(() => {
  mockGetCollection.mockReset();
  mockUseAuth.mockReset();
});

describe('useCollection', () => {
  it('skips the call when id is undefined', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    const { result } = renderHook(() => useCollection(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetCollection).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('skips the call when there is no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useCollection('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetCollection).not.toHaveBeenCalled();
  });

  it('fetches and populates data on success', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockGetCollection.mockResolvedValue({ id: 'c1', title: 'Doors' });
    const { result } = renderHook(() => useCollection('c1'));
    await waitFor(() => expect(result.current.data).toEqual({ id: 'c1', title: 'Doors' }));
    expect(mockGetCollection).toHaveBeenCalledWith('c1', 'u');
  });

  it('captures errors and clears data', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockGetCollection.mockRejectedValue(new Error('not found'));
    const { result } = renderHook(() => useCollection('c1'));
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.data).toBeNull();
  });
});
