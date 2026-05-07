import { useCallback, useState } from 'react';

import { deleteCollection } from '@services/collections.service';

interface State {
  pending: boolean;
  error: Error | null;
}

const INITIAL: State = { pending: false, error: null };

// Wraps the delete-collection edge function. Returns true on success so
// the caller can decide what to do next (typically `router.replace` to
// the collections tab — the hook stays navigation-agnostic per the
// service ⇄ component boundary in .claude/rules/architecture.md).
export function useDeleteCollection() {
  const [state, setState] = useState<State>(INITIAL);

  const run = useCallback(async (collectionId: string): Promise<boolean> => {
    setState({ pending: true, error: null });
    try {
      await deleteCollection(collectionId);
      setState({ pending: false, error: null });
      return true;
    } catch (err) {
      setState({
        pending: false,
        error: err instanceof Error ? err : new Error(String(err)),
      });
      return false;
    }
  }, []);

  return { ...state, run };
}
