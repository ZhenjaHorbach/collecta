import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@hooks/useAuth';
import { type CollectionDetail, getCollection } from '@services/collections.service';

interface State {
  data: CollectionDetail | null;
  loading: boolean;
  error: Error | null;
}

const INITIAL: State = { data: null, loading: true, error: null };

export function useCollection(id: string | undefined) {
  const { user } = useAuth();
  const [state, setState] = useState<State>(INITIAL);

  const load = useCallback(async () => {
    // Wait for both inputs before touching state. Clearing loading=false
    // here on a brief !user tick (auth re-hydrating after a fresh mount,
    // e.g. after router.dismissTo) used to flip the screen into the
    // `error || !data` branch and flash "load failed" for a frame.
    // AuthGuard keeps signed-out users off this route, so staying in
    // loading is safe.
    if (!id || !user) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getCollection(id, user.id);
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, [id, user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, refetch: load };
}
