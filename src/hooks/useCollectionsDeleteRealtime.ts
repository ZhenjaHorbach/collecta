import { useEffect, useRef } from 'react';

import { supabase } from '@services/supabase.service';

// Subscribes to DELETE events on `public.collections`. Used to drop stale
// cards from list/feed/discover screens after another device (or another
// user) wiped a collection through the delete-collection edge function.
//
// We deliberately listen on `collections` (one DELETE per collection)
// rather than on `finds` (N events per cascade) — fan-out is the same
// from the consumer's perspective (just refetch) but the channel sees
// 1/N traffic.
//
// TODO(scale): the subscription has no `filter` clause, so consumers
// refetch on ANY collection deletion globally. Fine at current scale
// (deletions are rare), but once Discover holds thousands of public
// collections worth caching, narrow the filter (e.g. only the ids
// currently rendered) to avoid wasted refetches.
//
// Channel name is uniquified per mount for the same reason as in
// useFeedRealtime — supabase-js keeps channels in a process-global map
// keyed by name and re-subscribing to a name in `subscribed` state throws
// "cannot add postgres_changes callbacks after subscribe()".
export function useCollectionsDeleteRealtime(onDelete: () => void): void {
  const callbackRef = useRef(onDelete);
  callbackRef.current = onDelete;

  useEffect(() => {
    const channelName = `collections-delete:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'collections' }, () => {
        callbackRef.current();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
}
