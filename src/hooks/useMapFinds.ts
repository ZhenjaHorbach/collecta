import { useEffect, useRef, useState } from 'react';

import { MAP_REGION_DEBOUNCE_MS } from '@constants/map';
import { listFindsForMap, type MapFind, type ViewportBounds } from '@services/finds.service';

interface State {
  finds: MapFind[];
  loading: boolean;
}

export function useMapFinds(bounds: ViewportBounds | null): State {
  const [state, setState] = useState<State>({ finds: [], loading: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!bounds) return;
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(async () => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const finds = await listFindsForMap(bounds);
        setState({ finds, loading: false });
      } catch {
        setState((s) => ({ ...s, loading: false }));
      }
    }, MAP_REGION_DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [bounds]);

  return state;
}
