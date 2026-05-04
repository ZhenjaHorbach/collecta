import { Storage } from '@services/storage.service';

const PRECISION = 4;
const KEY_PREFIX = 'geocode:';

export function geocodeKey(lat: number, lng: number): string {
  const r = (n: number): string => n.toFixed(PRECISION);
  return `${KEY_PREFIX}${r(lat)},${r(lng)}`;
}

export function readGeocodeCache(lat: number, lng: number): string | null {
  return Storage.get<string>(geocodeKey(lat, lng)) ?? null;
}

export function writeGeocodeCache(lat: number, lng: number, label: string): void {
  Storage.set(geocodeKey(lat, lng), label);
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
