import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@hooks/useAuth';
import { useUserLocation } from '@hooks/useUserLocation';
import { listFeed, type FeedItem } from '@services/feed.service';

const PAGE_SIZE = 20;

export interface UseFeedResult {
  items: FeedItem[];
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useFeed(): UseFeedResult {
  const { user } = useAuth();
  const { location } = useUserLocation();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const exhaustedRef = useRef(false);
  const inFlightRef = useRef(false);

  const fetchPage = useCallback(
    async (offset: number, mode: 'initial' | 'refresh' | 'more'): Promise<FeedItem[]> => {
      if (!user) return [];
      try {
        return await listFeed({
          viewerUserId: user.id,
          viewerLat: location?.lat ?? null,
          viewerLng: location?.lng ?? null,
          pageSize: PAGE_SIZE,
          pageOffset: offset,
        });
      } catch (e) {
        if (mode !== 'more') setError(e instanceof Error ? e : new Error(String(e)));
        return [];
      }
    },
    [user, location]
  );

  const refetch = useCallback(async (): Promise<void> => {
    if (!user || inFlightRef.current) return;
    inFlightRef.current = true;
    setRefreshing(true);
    setError(null);
    exhaustedRef.current = false;
    const page = await fetchPage(0, 'refresh');
    setItems(page);
    if (page.length < PAGE_SIZE) exhaustedRef.current = true;
    setRefreshing(false);
    setLoading(false);
    inFlightRef.current = false;
  }, [user, fetchPage]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!user || inFlightRef.current || exhaustedRef.current) return;
    inFlightRef.current = true;
    const page = await fetchPage(items.length, 'more');
    if (page.length < PAGE_SIZE) exhaustedRef.current = true;
    if (page.length > 0) {
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.findId));
        const merged = [...prev];
        for (const item of page) {
          if (!seen.has(item.findId)) merged.push(item);
        }
        return merged;
      });
    }
    inFlightRef.current = false;
  }, [user, items.length, fetchPage]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const page = await fetchPage(0, 'initial');
      if (cancelled) return;
      setItems(page);
      if (page.length < PAGE_SIZE) exhaustedRef.current = true;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, fetchPage]);

  return { items, loading, refreshing, error, refetch, loadMore };
}
