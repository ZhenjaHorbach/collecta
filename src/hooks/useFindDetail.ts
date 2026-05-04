import { useEffect, useState } from 'react';

import { getFindById, type FindDetail } from '@services/finds.service';
import { aggregateReactionsForFind, type ReactionAggregate } from '@services/reactions.service';

import { useAuth } from './useAuth';

export interface UseFindDetailResult {
  data: FindDetail | null;
  reactions: ReactionAggregate | null;
  loading: boolean;
  error: Error | null;
}

export function useFindDetail(findId: string | undefined): UseFindDetailResult {
  const { user } = useAuth();
  const [data, setData] = useState<FindDetail | null>(null);
  const [reactions, setReactions] = useState<ReactionAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!findId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [detail, agg] = await Promise.all([
          getFindById(findId),
          aggregateReactionsForFind(findId, user?.id ?? null),
        ]);
        if (cancelled) return;
        setData(detail);
        setReactions(agg);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [findId, user?.id]);

  return { data, reactions, loading, error };
}
