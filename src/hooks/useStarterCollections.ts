import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { CollectionSchema, type Collection } from '@schemas';

import { supabase } from '@services/supabase.service';

// Reads the 10 system-seeded starter collections (creator_id = system user).
// Used by the temporary "Starter collections" strip on CollectionsScreen
// that lives until Day 12's Discover screen replaces it.
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

const CollectionListSchema = CollectionSchema.array();

interface State {
  data: Collection[];
  loading: boolean;
  error: Error | null;
}

const INITIAL: State = { data: [], loading: true, error: null };

export function useStarterCollections() {
  const [state, setState] = useState<State>(INITIAL);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('creator_id', SYSTEM_USER_ID)
        .eq('is_public', true)
        .order('category', { ascending: true });
      if (error) throw error;
      setState({ data: CollectionListSchema.parse(data ?? []), loading: false, error: null });
    } catch (err) {
      setState({
        data: [],
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return { ...state, refetch: load };
}
