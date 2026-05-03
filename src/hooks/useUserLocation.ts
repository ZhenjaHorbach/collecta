import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export interface UserLocation {
  lat: number;
  lng: number;
}

interface State {
  location: UserLocation | null;
  status: 'idle' | 'loading' | 'denied' | 'ready' | 'unavailable';
}

// Falls back silently when permission is denied — finds still load by viewport,
// only the "near you" sheet hides.
export function useUserLocation(): State {
  const [state, setState] = useState<State>({ location: null, status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (status !== 'granted') {
        setState({ location: null, status: 'denied' });
        return;
      }

      // Last-known fix is usually instant; resolves the map's initialRegion
      // without waiting for a fresh GPS fix (which can take seconds outdoors).
      try {
        const cached = await Location.getLastKnownPositionAsync();
        if (cancelled) return;
        if (cached) {
          setState({
            location: { lat: cached.coords.latitude, lng: cached.coords.longitude },
            status: 'ready',
          });
        }
      } catch {
        // ignore — fall through to getCurrentPositionAsync
      }

      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setState({
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          status: 'ready',
        });
      } catch {
        setState((prev) => (prev.location ? prev : { location: null, status: 'unavailable' }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
