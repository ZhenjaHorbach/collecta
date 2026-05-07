import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { MAP_REGION_DEBOUNCE_MS } from '@constants/map';
import { listFindsForMap, type MapFind, type ViewportBounds } from '@services/finds.service';

interface State {
  finds: MapFind[];
  loading: boolean;
}

// Debounce the viewport so panning/zooming doesn't fire one RPC per
// frame — the user can sweep across the map at 60 Hz, we only want one
// listFindsForMap call after they settle. use-debounce auto-cancels on
// unmount and on rapid bounds changes; the effect below just reacts
// to the settled value.
export function useMapFinds(bounds: ViewportBounds | null): State {
  const [state, setState] = useState<State>({ finds: [], loading: false });
  const [debouncedBounds] = useDebounce(bounds, MAP_REGION_DEBOUNCE_MS);

  useEffect(() => {
    if (!debouncedBounds) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    void (async () => {
      try {
        const finds = await listFindsForMap(debouncedBounds);
        if (cancelled) return;
        setState({ finds, loading: false });
      } catch {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedBounds]);

  return state;
}
