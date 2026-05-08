// useAuth: subscribes to supabase.auth.onAuthStateChange, hydrates from
// getSession on mount, exposes derived `user`. Tests pin: initial session
// is loaded, state changes propagate, unsubscribe runs on unmount.

/* eslint-disable import/first */
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('@services/supabase.service', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => mockOnAuthStateChange(cb),
    },
  },
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { useAuth } from '../useAuth';
/* eslint-enable import/first */

beforeEach(() => {
  mockGetSession.mockReset();
  mockOnAuthStateChange.mockReset();
  mockUnsubscribe.mockReset();
  mockOnAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  }));
});

describe('useAuth', () => {
  it('starts with loading=true and resolves once getSession returns', async () => {
    const session = { user: { id: 'u-1', email: 'a@b.co' } };
    mockGetSession.mockResolvedValue({ data: { session } });
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toEqual(session);
    expect(result.current.user).toEqual(session.user);
  });

  it('updates state when onAuthStateChange fires', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    let listener: ((e: string, s: unknown) => void) | null = null;
    mockOnAuthStateChange.mockImplementation((cb) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    // Simulate sign-in
    const newSession = { user: { id: 'u-2' } };
    await waitFor(() => {
      listener?.('SIGNED_IN', newSession);
    });
    await waitFor(() => expect(result.current.user).toMatchObject({ id: 'u-2' }));
  });

  it('unsubscribes on unmount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const { unmount } = renderHook(() => useAuth());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
