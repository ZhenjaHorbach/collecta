// useDeleteCollection: thin mutation. Tests pin: success returns true,
// error returns false + sets error state.

/* eslint-disable import/first */
const mockDelete = jest.fn();
jest.mock('@services/collections.service', () => ({
  deleteCollection: (...args: unknown[]) => mockDelete(...args),
}));

import { act, renderHook } from '@testing-library/react-native';

import { useDeleteCollection } from '../useDeleteCollection';
/* eslint-enable import/first */

beforeEach(() => mockDelete.mockReset());

describe('useDeleteCollection', () => {
  it('returns true on success', async () => {
    mockDelete.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteCollection());
    let ok = false;
    await act(async () => {
      ok = await result.current.run('c1');
    });
    expect(ok).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockDelete).toHaveBeenCalledWith('c1');
  });

  it('returns false and stores the error on failure', async () => {
    mockDelete.mockRejectedValue(new Error('rls'));
    const { result } = renderHook(() => useDeleteCollection());
    let ok = true;
    await act(async () => {
      ok = await result.current.run('c1');
    });
    expect(ok).toBe(false);
    expect(result.current.error?.message).toBe('rls');
  });
});
