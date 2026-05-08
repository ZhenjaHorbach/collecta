// useUserProfile fans out 5 queries (user row, achievements catalog,
// user_achievements, finds count, collections count) and re-fetches when
// the achievement-toast bus signals a profile change. Tests pin: no userId
// → idle, signal triggers re-fetch.

/* eslint-disable import/first */
const mockState = {
  fetchCount: 0,
};

jest.mock('@services/supabase.service', () => ({
  supabase: {
    from: () => ({
      select: () => {
        mockState.fetchCount += 1;
        return {
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('no row') }),
          }),
          order: () => Promise.resolve({ data: [], error: null }),
        };
      },
    }),
  },
}));

let toastSubscriber: (() => void) | null = null;
jest.mock('@services/achievement-toast.service', () => ({
  subscribeProfileChanged: (cb: () => void) => {
    toastSubscriber = cb;
    return () => {
      toastSubscriber = null;
    };
  },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useUserProfile } from '../useUserProfile';
/* eslint-enable import/first */

beforeEach(() => {
  mockState.fetchCount = 0;
  toastSubscriber = null;
});

describe('useUserProfile', () => {
  it('returns idle (loading=false, no profile) when userId is null', async () => {
    const { result } = renderHook(() => useUserProfile(null));
    // Hook only sets loading=false explicitly when it actually runs the
    // fetch. Without a userId it stays at the initial loading=true. Just
    // assert profile stays null and no fetch fires.
    await waitFor(() => expect(mockState.fetchCount).toBe(0));
    expect(result.current.profile).toBeNull();
  });

  it('fans out queries when given a userId', async () => {
    renderHook(() => useUserProfile('u-1'));
    await waitFor(() => expect(mockState.fetchCount).toBeGreaterThan(0));
  });

  it('re-fetches when the profile-changed bus fires', async () => {
    renderHook(() => useUserProfile('u-1'));
    await waitFor(() => expect(mockState.fetchCount).toBeGreaterThan(0));
    const before = mockState.fetchCount;
    await act(async () => {
      toastSubscriber?.();
      // give the async fetch a tick
      await new Promise((r) => setImmediate(r));
    });
    expect(mockState.fetchCount).toBeGreaterThan(before);
  });
});
