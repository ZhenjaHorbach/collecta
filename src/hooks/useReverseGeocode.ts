import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { readGeocodeCache, writeGeocodeCache } from '@utils/geocode.utils';

export interface UseReverseGeocodeResult {
  label: string | null;
  loading: boolean;
}

function buildLabel(addr: Location.LocationGeocodedAddress): string | null {
  const street = [addr.name, addr.street].filter(Boolean).join(' ').trim();
  const head = street || addr.district || addr.subregion || addr.city || addr.region || '';
  const tail = head !== addr.city && addr.city ? addr.city : '';
  const out = [head, tail].filter(Boolean).join(', ');
  return out || null;
}

export function useReverseGeocode(lat: number | null, lng: number | null): UseReverseGeocodeResult {
  const [label, setLabel] = useState<string | null>(() =>
    lat != null && lng != null ? readGeocodeCache(lat, lng) : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) return;
    const cached = readGeocodeCache(lat, lng);
    if (cached) {
      setLabel(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (cancelled) return;
        const first = results[0];
        if (!first) {
          setLabel(null);
          return;
        }
        const built = buildLabel(first);
        if (built) {
          writeGeocodeCache(lat, lng, built);
          setLabel(built);
        } else {
          setLabel(null);
        }
      } catch (e) {
        if (!cancelled) console.warn('[geocode] reverse failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return { label, loading };
}
