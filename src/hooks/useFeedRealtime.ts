import { useEffect, useRef } from 'react';

import { supabase } from '@services/supabase.service';

export type FeedRealtimeChange = 'find' | 'reaction';

// Subscribes to inserts on `finds` and any change on `reactions`. The callback
// just flags a change — the consumer decides whether to refetch the whole
// feed (the simple path) or merge in place. Re-fetching keeps RPC ranking
// authoritative; merging would drift from `score` ordering.
//
// Channel name is uniquified per mount: supabase-js keeps channels in a
// process-global map keyed by name, so reusing `feed-live` across remounts
// (StrictMode double-invoke, AuthGuard re-render) makes the second `.on()`
// run against a channel already in `subscribed` state and throws
// "cannot add postgres_changes callbacks after subscribe()".
export function useFeedRealtime(onChange: (kind: FeedRealtimeChange) => void): void {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    const channelName = `feed-live:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'finds' }, () =>
        callbackRef.current('find')
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () =>
        callbackRef.current('reaction')
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
}
