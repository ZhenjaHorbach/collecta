// geocode.utils.ts caches reverse-geocoded labels in MMKV keyed by
// rounded-to-4dp coordinates. The test pins the rounding (cache-key shape)
// and the round-trip — those are the failure modes that bite in prod.

/* eslint-disable import/first */
const mockStore = new Map<string, string>();

jest.mock('@services/storage.service', () => ({
  Storage: {
    get: <T>(key: string): T | undefined => mockStore.get(key) as T | undefined,
    set: <T>(key: string, value: T): void => {
      mockStore.set(key, value as unknown as string);
    },
  },
}));

import { formatCoords, geocodeKey, readGeocodeCache, writeGeocodeCache } from '../geocode.utils';
/* eslint-enable import/first */

describe('geocodeKey', () => {
  it('formats coords with 4-decimal precision and a stable prefix', () => {
    expect(geocodeKey(52.230012, 21.012345)).toBe('geocode:52.2300,21.0123');
  });

  it('treats sub-precision differences as the same key (cache hit)', () => {
    // 4dp precision (~11m bucket) is intentional — photos taken a few metres
    // apart at the same spot share a cache entry.
    expect(geocodeKey(52.23001, 21.01231)).toBe(geocodeKey(52.23004, 21.01234));
  });

  it('handles negative coordinates', () => {
    expect(geocodeKey(-33.8688, -151.2093)).toBe('geocode:-33.8688,-151.2093');
  });
});

describe('cache round-trip', () => {
  beforeEach(() => mockStore.clear());

  it('returns null when no cached label exists', () => {
    expect(readGeocodeCache(52.23, 21.01)).toBeNull();
  });

  it('stores under geocodeKey and reads back', () => {
    writeGeocodeCache(52.23, 21.01, 'Warsaw, Poland');
    expect(readGeocodeCache(52.23, 21.01)).toBe('Warsaw, Poland');
  });

  it('cache hits when the lookup coords land in the same 4dp bucket', () => {
    writeGeocodeCache(52.230012, 21.012312, 'Warsaw, Poland');
    expect(readGeocodeCache(52.230049, 21.012349)).toBe('Warsaw, Poland');
  });
});

describe('formatCoords', () => {
  it('renders 4-decimal display string', () => {
    expect(formatCoords(52.230012, 21.012345)).toBe('52.2300, 21.0123');
  });
});
