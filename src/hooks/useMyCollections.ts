import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuth } from '@hooks/useAuth';
import {
  type CollectionWithProgress,
  listMyCollections,
  listPickedUpCollections,
} from '@services/collections.service';

interface State {
  mine: CollectionWithProgress[];
  pickedUp: CollectionWithProgress[];
  loading: boolean;
  error: Error | null;
}

const INITIAL: State = { mine: [], pickedUp: [], loading: true, error: null };

export function useMyCollections() {
  const { user } = useAuth();
  const [state, setState] = useState<State>(INITIAL);

  const load = useCallback(async () => {
    // Wait for auth — flipping loading=false on a brief !user tick used to
    // surface as the "empty / failed" UI for a frame. AuthGuard keeps
    // signed-out users off these screens, so staying in loading is safe.
    if (!user) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [mine, pickedUp] = await Promise.all([
        listMyCollections(user.id),
        listPickedUpCollections(user.id),
      ]);
      setState({ mine, pickedUp, loading: false, error: null });
    } catch (err) {
      setState({
        mine: [],
        pickedUp: [],
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return { ...state, refetch: load };
}
