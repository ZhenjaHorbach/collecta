import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { CollectionCategory } from '@constants/categories';
import {
  listDiscoverCollections,
  type DiscoverCollection,
  type DiscoverSort,
} from '@services/discover.service';

interface State {
  data: DiscoverCollection[];
  loading: boolean;
  error: Error | null;
}

const INITIAL: State = { data: [], loading: true, error: null };

interface Args {
  category: CollectionCategory | null;
  query: string;
  sort: DiscoverSort;
}

// Drives the Discover grid. Filters change on the JS side debounced by the
// caller — the hook itself just tracks the latest async run and discards
// stale responses.
export function useDiscover({ category, query, sort }: Args) {
  const [state, setState] = useState<State>(INITIAL);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await listDiscoverCollections({ category, query, sort });
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: [],
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, [category, query, sort]);

  // Refresh on focus so a fork made on the detail screen is reflected when
  // the user pops back.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Re-run on filter change while the screen is mounted; useFocusEffect only
  // covers focus transitions.
  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, refetch: load };
}
