import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@hooks/useAuth';
import {
  aggregateReactionsForFind,
  toggleReaction,
  type ReactionAggregate,
  type ReactionType,
} from '@services/reactions.service';

export interface UseReactionsResult {
  counts: Record<ReactionType, number>;
  mine: Set<ReactionType>;
  toggle: (type: ReactionType) => Promise<void>;
}

// Optimistic toggle: count + my-mark flip immediately, server roundtrip happens
// in the background. If the server call fails, we revert the local state and
// surface the error in console (the toast surface for reaction errors is not
// in scope today).
//
// `initialAggregate` lets a parent (e.g. useFeed) pre-populate from a single
// batched query and skip the per-item refetch entirely.
export function useReactions(
  findId: string,
  initialAggregate?: ReactionAggregate
): UseReactionsResult {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<ReactionType, number>>(
    () => initialAggregate?.counts ?? { like: 0, fire: 0, wow: 0 }
  );
  const [mine, setMine] = useState<Set<ReactionType>>(() => new Set(initialAggregate?.mine ?? []));

  useEffect(() => {
    if (!user) return;
    if (initialAggregate) return; // pre-seeded by caller; no per-item fetch
    let cancelled = false;
    void (async () => {
      try {
        const agg = await aggregateReactionsForFind(findId, user.id);
        if (cancelled) return;
        setCounts(agg.counts);
        setMine(new Set(agg.mine));
      } catch (e) {
        console.warn('[reactions] aggregate failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [findId, user, initialAggregate]);

  const toggle = useCallback(
    async (type: ReactionType): Promise<void> => {
      if (!user) return;
      const had = mine.has(type);
      // Optimistic flip
      setMine((prev) => {
        const next = new Set(prev);
        if (had) next.delete(type);
        else next.add(type);
        return next;
      });
      setCounts((prev) => ({ ...prev, [type]: Math.max(0, prev[type] + (had ? -1 : 1)) }));
      try {
        await toggleReaction(user.id, findId, type, had);
      } catch (e) {
        console.warn('[reactions] toggle failed; reverting', e);
        setMine((prev) => {
          const next = new Set(prev);
          if (had) next.add(type);
          else next.delete(type);
          return next;
        });
        setCounts((prev) => ({ ...prev, [type]: Math.max(0, prev[type] + (had ? 1 : -1)) }));
      }
    },
    [findId, mine, user]
  );

  return { counts, mine, toggle };
}
