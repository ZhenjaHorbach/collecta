import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@hooks/useAuth';
import { forkCollection, isForkedByMe } from '@services/collections.service';

interface State {
  // null = not yet checked (loading); a string = id of the user's fork;
  // false = source belongs to user already (no fork needed) or no user.
  forkId: string | null | false;
  pending: boolean;
  error: Error | null;
}

const INITIAL: State = { forkId: null, pending: false, error: null };

// Wraps the fork RPC + the "do I already have a copy" lookup. Used by both
// CollectionDetailScreen (button) and Discover cards (badge). The hook
// returns `forkId === false` when the source is the user's own collection so
// the caller can hide the fork affordance entirely.
export function useForkCollection(
  sourceId: string | undefined,
  sourceCreatorId: string | undefined
) {
  const { user } = useAuth();
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    if (!sourceId || !user) {
      setState(INITIAL);
      return;
    }
    if (sourceCreatorId && sourceCreatorId === user.id) {
      setState({ forkId: false, pending: false, error: null });
      return;
    }
    setState({ forkId: null, pending: false, error: null });
    isForkedByMe(sourceId, user.id)
      .then((id) => {
        if (cancelled) return;
        setState({ forkId: id, pending: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          forkId: null,
          pending: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [sourceId, sourceCreatorId, user]);

  const fork = useCallback(async (): Promise<string | null> => {
    if (!sourceId) return null;
    setState((s) => ({ ...s, pending: true, error: null }));
    try {
      const newId = await forkCollection(sourceId);
      setState({ forkId: newId, pending: false, error: null });
      return newId;
    } catch (err) {
      setState((s) => ({
        ...s,
        pending: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
      return null;
    }
  }, [sourceId]);

  return { ...state, fork };
}
