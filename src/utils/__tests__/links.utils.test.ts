// links.utils.ts wraps expo-linking — the value of testing it is verifying
// that the path strings stay in sync with the Expo Router routes
// (/find/[id]/index.tsx, /collection/[id]/index.tsx). Drift here = broken
// share cards and dead deep links.

/* eslint-disable import/first */
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `collecta://app${path}`),
}));

import * as Linking from 'expo-linking';

import { buildCollectionUrl, buildFindUrl } from '../links.utils';
/* eslint-enable import/first */

describe('buildFindUrl', () => {
  it('routes to /find/<id>', () => {
    const url = buildFindUrl('f-123');
    expect(url).toBe('collecta://app/find/f-123');
    expect(Linking.createURL).toHaveBeenCalledWith('/find/f-123');
  });
});

describe('buildCollectionUrl', () => {
  it('routes to /collection/<id>', () => {
    const url = buildCollectionUrl('c-abc');
    expect(url).toBe('collecta://app/collection/c-abc');
    expect(Linking.createURL).toHaveBeenCalledWith('/collection/c-abc');
  });
});
