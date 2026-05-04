import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FeedItem } from '@components/FeedItem';
import { SafeAreaView } from '@components/SafeAreaView';
import { Spinner } from '@components/Spinner';
import { useColors } from '@hooks/useColors';
import { useFeed } from '@hooks/useFeed';
import { useFeedRealtime } from '@hooks/useFeedRealtime';
import type { FeedItem as FeedItemModel } from '@services/feed.service';

export function FeedScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { items, loading, refreshing, error, refetch, loadMore } = useFeed();

  // A new find or reaction anywhere triggers a re-fetch so RPC-ranked order
  // stays authoritative. Cheap on Supabase Realtime — one channel, two tables.
  useFeedRealtime(() => {
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
          renderItem={({ item }) => <FeedItem item={item} />}
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
