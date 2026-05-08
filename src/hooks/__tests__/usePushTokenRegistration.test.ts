// usePushTokenRegistration: once-per-session guard, gated by setting +
// auth + non-web platform. Tests pin: web → no-op, opted-out → clear,
// signed-in + opted-in → register exactly once.

/* eslint-disable import/first */
const mockRegister = jest.fn();
const mockClear = jest.fn();

jest.mock('@services/notifications.service', () => ({
  registerForPushNotifications: (...args: unknown[]) => mockRegister(...args),
  clearPushToken: (...args: unknown[]) => mockClear(...args),
}));

const platformState = { OS: 'ios' as 'ios' | 'android' | 'web' };
jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return platformState.OS;
    },
  },
}));

const mockUseAuth = jest.fn();
const mockUseSetting = jest.fn();
jest.mock('../useAuth', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('../useSetting', () => ({ useSetting: () => mockUseSetting() }));

import { renderHook } from '@testing-library/react-native';

import { usePushTokenRegistration } from '../usePushTokenRegistration';
/* eslint-enable import/first */

beforeEach(() => {
  mockRegister.mockReset();
  mockClear.mockReset();
  mockUseAuth.mockReset();
  mockUseSetting.mockReset();
  platformState.OS = 'ios';
});

describe('usePushTokenRegistration', () => {
  it('does nothing on web (no Expo push there)', () => {
    platformState.OS = 'web';
    mockUseAuth.mockReturnValue({ user: { id: 'u' }, loading: false });
    mockUseSetting.mockReturnValue([true]);
    renderHook(() => usePushTokenRegistration());
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('does nothing while auth is still loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    mockUseSetting.mockReturnValue([true]);
    renderHook(() => usePushTokenRegistration());
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('registers exactly once per userId when enabled', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u-1' }, loading: false });
    mockUseSetting.mockReturnValue([true]);
    const { rerender } = renderHook(() => usePushTokenRegistration());
    rerender({});
    rerender({});
    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockRegister).toHaveBeenCalledWith('u-1');
  });

  it('clears the token when the user opts out', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u-1' }, loading: false });
    mockUseSetting.mockReturnValue([false]);
    renderHook(() => usePushTokenRegistration());
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockClear).toHaveBeenCalledWith('u-1');
  });
});
