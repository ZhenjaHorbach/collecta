// Push token registration: gated on Device.isDevice (no simulators), gated
// on permissions, idempotent on transport errors. Tests pin those gates so a
// dev install on Simulator never burns the prompt and a denied permission
// never writes a stale token.

/* eslint-disable import/first */
const mockState = {
  isDevice: true,
  existingPerm: 'undetermined' as 'granted' | 'denied' | 'undetermined',
  requestedPerm: 'granted' as 'granted' | 'denied' | 'undetermined',
  tokenData: 'ExpoPushToken[abc]',
};

const mockGetPerm = jest.fn();
const mockRequestPerm = jest.fn();
const mockGetToken = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();

jest.mock('expo-device', () => ({
  get isDevice() {
    return mockState.isDevice;
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => mockGetPerm(),
  requestPermissionsAsync: () => mockRequestPerm(),
  getExpoPushTokenAsync: (...args: unknown[]) => mockGetToken(...args),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'proj-1' } } } },
}));

jest.mock('../supabase.service', () => ({
  supabase: {
    from: () => ({
      update: (row: unknown) => {
        mockUpdate(row);
        return { eq: (...args: unknown[]) => mockEq(...args) };
      },
    }),
  },
}));

import {
  clearPushToken,
  registerForPushNotifications,
  savePushToken,
} from '../notifications.service';
/* eslint-enable import/first */

beforeEach(() => {
  mockState.isDevice = true;
  mockState.existingPerm = 'undetermined';
  mockState.requestedPerm = 'granted';
  mockState.tokenData = 'ExpoPushToken[abc]';
  mockGetPerm.mockReset();
  mockRequestPerm.mockReset();
  mockGetToken.mockReset();
  mockUpdate.mockReset();
  mockEq.mockReset();
  mockGetPerm.mockImplementation(async () => ({ status: mockState.existingPerm }));
  mockRequestPerm.mockImplementation(async () => ({ status: mockState.requestedPerm }));
  mockGetToken.mockImplementation(async () => ({ data: mockState.tokenData }));
  mockEq.mockImplementation(async () => ({ data: null, error: null }));
});

describe('registerForPushNotifications', () => {
  it('returns null on simulators (Device.isDevice = false) without prompting', async () => {
    mockState.isDevice = false;
    const out = await registerForPushNotifications('u');
    expect(out).toBeNull();
    expect(mockGetPerm).not.toHaveBeenCalled();
    expect(mockRequestPerm).not.toHaveBeenCalled();
  });

  it('skips the prompt when permission is already granted', async () => {
    mockState.existingPerm = 'granted';
    const out = await registerForPushNotifications('u');
    expect(mockRequestPerm).not.toHaveBeenCalled();
    expect(out).toBe('ExpoPushToken[abc]');
  });

  it('returns null when the user denies the prompt', async () => {
    mockState.existingPerm = 'undetermined';
    mockState.requestedPerm = 'denied';
    const out = await registerForPushNotifications('u');
    expect(out).toBeNull();
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it('passes projectId to getExpoPushTokenAsync', async () => {
    await registerForPushNotifications('u');
    expect(mockGetToken).toHaveBeenCalledWith({ projectId: 'proj-1' });
  });

  it('persists the token via savePushToken on success', async () => {
    await registerForPushNotifications('u-42');
    expect(mockUpdate).toHaveBeenCalledWith({ expo_push_token: 'ExpoPushToken[abc]' });
    expect(mockEq).toHaveBeenCalledWith('id', 'u-42');
  });

  it('swallows errors and returns null', async () => {
    mockGetToken.mockRejectedValueOnce(new Error('network'));
    const out = await registerForPushNotifications('u');
    expect(out).toBeNull();
  });
});

describe('savePushToken / clearPushToken', () => {
  it('savePushToken writes the token scoped to the user', async () => {
    await savePushToken('u', 'tok');
    expect(mockUpdate).toHaveBeenCalledWith({ expo_push_token: 'tok' });
    expect(mockEq).toHaveBeenCalledWith('id', 'u');
  });

  it('clearPushToken nulls the column', async () => {
    await clearPushToken('u');
    expect(mockUpdate).toHaveBeenCalledWith({ expo_push_token: null });
    expect(mockEq).toHaveBeenCalledWith('id', 'u');
  });
});
