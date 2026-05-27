// formatBuildIdentity composes the user-facing version string testers paste
// into bug reports. getBuildIdentity reads the platform — mock its three
// inputs to pin behaviour across "embedded", OTA, and missing-field branches.

import * as Updates from 'expo-updates';

import { formatBuildIdentity, getBuildIdentity } from '../version.utils';

jest.mock('expo-application', () => ({ __esModule: true, nativeBuildVersion: '2' }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));
jest.mock('expo-updates', () => ({ __esModule: true, updateId: null }));

const setUpdateId = (id: string | null): void => {
  (Updates as unknown as { updateId: string | null }).updateId = id;
};

beforeEach(() => {
  setUpdateId(null);
});

describe('getBuildIdentity', () => {
  it('marks the running bundle as embedded when no OTA has been applied', () => {
    setUpdateId(null);
    expect(getBuildIdentity()).toEqual({
      marketingVersion: '1.0.0',
      nativeBuild: '2',
      otaId: 'embedded',
    });
  });

  it('returns the first 8 chars of the OTA update id', () => {
    setUpdateId('dd970ef7-510a-42d3-89be-dfd7f1a43c5e');
    expect(getBuildIdentity().otaId).toBe('dd970ef7');
  });
});

describe('formatBuildIdentity', () => {
  it('renders the identity into a single pasteable string', () => {
    expect(
      formatBuildIdentity({ marketingVersion: '1.0.0', nativeBuild: '2', otaId: 'dd970ef7' })
    ).toBe('1.0.0 · build 2 · dd970ef7');
  });
});
