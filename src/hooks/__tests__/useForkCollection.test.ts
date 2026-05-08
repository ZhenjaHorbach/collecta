// useForkCollection: combines isForkedByMe lookup + fork RPC. Tests pin:
// "source is mine" branch returns forkId=false, existing fork returns its
// id, no fork yet returns null, errors captured.

/* eslint-disable import/first */
const mockIsForkedByMe = jest.fn();
const mockForkCollection = jest.fn();

jest.mock('@services/collections.service', () => ({
  isForkedByMe: (...args: unknown[]) => mockIsForkedByMe(...args),
  forkCollection: (...args: unknown[]) => mockForkCollection(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('@hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

import { renderHook, waitFor } from '@testing-library/react-native';

import { useForkCollection } from '../useForkCollection';
/* eslint-enable import/first */

beforeEach(() => {
  mockIsForkedByMe.mockReset();
  mockForkCollection.mockReset();
  mockUseAuth.mockReset();
});

describe('useForkCollection', () => {
  it('returns forkId=false when source belongs to current user', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    const { result } = renderHook(() => useForkCollection('c1', 'u'));
    await waitFor(() => expect(result.current.forkId).toBe(false));
    expect(mockIsForkedByMe).not.toHaveBeenCalled();
  });

  it('looks up existing fork when source is foreign', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockIsForkedByMe.mockResolvedValue('fork-id');
    const { result } = renderHook(() => useForkCollection('c1', 'other'));
    await waitFor(() => expect(result.current.forkId).toBe('fork-id'));
  });

  it('captures isForkedByMe errors', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockIsForkedByMe.mockRejectedValue(new Error('rls'));
    const { result } = renderHook(() => useForkCollection('c1', 'other'));
    await waitFor(() => expect(result.current.error?.message).toBe('rls'));
  });

  it('stays at INITIAL when there is no source or no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useForkCollection('c1', 'other'));
    await waitFor(() => expect(result.current.forkId).toBeNull());
  });
});
