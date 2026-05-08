// useUserLocation: permission-gated GPS fix. Tests pin: denied permission
// → status='denied' silently, granted → fixes from last-known + fresh fix.

/* eslint-disable import/first */
const mockRequestPerm = jest.fn();
const mockGetLastKnown = jest.fn();
const mockGetCurrent = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => mockRequestPerm(),
  getLastKnownPositionAsync: () => mockGetLastKnown(),
  getCurrentPositionAsync: (...args: unknown[]) => mockGetCurrent(...args),
  Accuracy: { Balanced: 3 },
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { useUserLocation } from '../useUserLocation';
/* eslint-enable import/first */

beforeEach(() => {
  mockRequestPerm.mockReset();
  mockGetLastKnown.mockReset();
  mockGetCurrent.mockReset();
});

describe('useUserLocation', () => {
  it('returns status=denied without GPS calls when permission is refused', async () => {
    mockRequestPerm.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.status).toBe('denied'));
    expect(mockGetLastKnown).not.toHaveBeenCalled();
    expect(mockGetCurrent).not.toHaveBeenCalled();
    expect(result.current.location).toBeNull();
  });

  it('uses last-known fix when available for an instant answer', async () => {
    mockRequestPerm.mockResolvedValue({ status: 'granted' });
    mockGetLastKnown.mockResolvedValue({ coords: { latitude: 52.23, longitude: 21.01 } });
    mockGetCurrent.mockResolvedValue({ coords: { latitude: 52.23, longitude: 21.01 } });
    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.location).toEqual({ lat: 52.23, lng: 21.01 }));
    expect(result.current.status).toBe('ready');
  });
});
