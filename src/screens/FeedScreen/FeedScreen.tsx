import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDebouncedCallback } from 'use-debounce';

import { FeedItem } from '@components/FeedItem';
import { SafeAreaView } from '@components/SafeAreaView';
import { Spinner } from '@components/Spinner';
import { useColors } from '@hooks/useColors';
import { useCollectionsDeleteRealtime } from '@hooks/useCollectionsDeleteRealtime';
import { useFeed } from '@hooks/useFeed';
import { useFeedRealtime } from '@hooks/useFeedRealtime';
import type { FeedItem as FeedItemModel } from '@services/feed.service';

const REALTIME_DEBOUNCE_MS = 2000;

export function FeedScreen(): React.ReactElement {
  const { t } = useTranslation();
  const colors = useColors();
  const { items, reactionAggregates, loading, refreshing, error, refetch, loadMore } = useFeed();

  // Debounce realtime-driven refetches: a single user reacting to ten finds
  // would otherwise burst ten full RPC calls. 2 s coalesces bursts without
  // making the feed feel stale. use-debounce auto-cancels on unmount and
  // handles strict-mode double-invokes — no manual ref/cleanup.
  const debouncedRefetch = useDebouncedCallback(() => {
    void refetch();
  }, REALTIME_DEBOUNCE_MS);

  useFeedRealtime(debouncedRefetch);

  // A deleted collection cascades into deleted finds — refetch so the
  // stale cards drop out. No debounce: collection deletion is a single
  // explicit user action, not a burst stream like reactions, so one
  // event => one refetch is fine.
  useCollectionsDeleteRealtime(() => {
    void refetch();
  });

  return (
    <SafeAreaView>
      <View className="px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-text">{t('feed.title')}</Text>
      </View>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-text">{t('common.error')}</Text>
        </View>
      ) : (
        <FlatList<FeedItemModel>
          data={items}
          keyExtractor={(item) => item.findId}
          renderItem={({ item }) => (
            <FeedItem item={item} initialReactions={reactionAggregates.get(item.findId)} />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            void loadMore();
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void refetch();
              }}
              tintColor={colors.text}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-base text-text-muted">{t('feed.empty')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
