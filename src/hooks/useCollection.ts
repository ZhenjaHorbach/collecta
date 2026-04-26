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
    if (!id || !user) {
      setState({ data: null, loading: false, error: null });
      return;
    }
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
