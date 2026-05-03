import { formatDistanceKm, haversineKm } from '../geo.utils';

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    const p = { lat: 40.7128, lng: -74.006 };
    expect(haversineKm(p, p)).toBe(0);
  });

  it('matches known distance NYC -> Brooklyn (~10 km)', () => {
    const nyc = { lat: 40.7128, lng: -74.006 };
    const brooklyn = { lat: 40.6782, lng: -73.9442 };
    const km = haversineKm(nyc, brooklyn);
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(10);
  });

  it('is symmetric', () => {
    const a = { lat: 51.5, lng: -0.12 };
    const b = { lat: 48.85, lng: 2.35 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});

describe('formatDistanceKm', () => {
  it('uses meters under 1 km', () => {
    expect(formatDistanceKm(0.3)).toBe('300 m');
  });

  it('uses one decimal between 1 and 10 km', () => {
    expect(formatDistanceKm(2.345)).toBe('2.3 km');
  });

  it('rounds at 10+ km', () => {
    expect(formatDistanceKm(12.7)).toBe('13 km');
  });
});
