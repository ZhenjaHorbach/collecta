import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { CollectionCard } from '@components/CollectionCard';
import { EmptyState } from '@components/EmptyState';
import { SafeAreaView } from '@components/SafeAreaView';
import { Spinner } from '@components/Spinner';
import { Tabs } from '@components/Tabs';
import { useCollectionsDeleteRealtime } from '@hooks/useCollectionsDeleteRealtime';
import { useColors } from '@hooks/useColors';
import { useMyCollections } from '@hooks/useMyCollections';
import { DiscoverScreen } from '@screens/DiscoverScreen';
import type { CollectionWithProgress } from '@services/collections.service';

type TabKey = 'discover' | 'mine' | 'pickedUp';

// Two-column grid sizing — kept here so a lone trailing card in an odd
// total doesn't stretch across the row (flex-1 has no sibling to share
// with). Mirrors DiscoverScreen so the visual rhythm matches.
const GRID_PADDING = 16;
const GRID_GAP = 12;
const GRID_COLUMNS = 2;

export function CollectionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const cellWidth = (screenWidth - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  const [tab, setTab] = useState<TabKey>('discover');
  const { mine, pickedUp, loading, error, refetch } = useMyCollections();

  // When the user (or another device they're signed in on) deletes a
  // collection, drop the stale tile from "Mine" without waiting for the
  // next pull-to-refresh.
  useCollectionsDeleteRealtime(() => {
    void refetch();
  });

  const tabs = useMemo(
    () =>
      [
        { key: 'discover' as const, label: t('collections.tabs2.discover') },
        { key: 'mine' as const, label: t('collections.tabs2.mine') },
        // pickedUp kept while user_collections still has rows for legacy
        // users; it disappears entirely once that table is dropped.
        { key: 'pickedUp' as const, label: t('collections.tabs.pickedUp') },
      ] as const,
    [t]
  );

  const ownedAndJoined = tab === 'mine' ? mine : pickedUp;

  return (
    <SafeAreaView testID="collections-screen">
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-text">{t('collections.title')}</Text>
        <TouchableOpacity
          testID="collections-new-button"
          onPress={() => router.push('/collection/create')}
          accessibilityRole="button"
          accessibilityLabel={t('collections.newCollection')}
          className="px-4 py-2 rounded-full bg-gold">
          <Text className="text-on-gold font-semibold text-sm">
            {t('collections.newCollection')}
          </Text>
        </TouchableOpacity>
      </View>
      <View className="px-5 pb-3">
        <Tabs<TabKey> options={tabs} value={tab} onChange={setTab} testIDPrefix="collections-tab" />
      </View>
      {tab === 'discover' ? (
        <DiscoverScreen />
      ) : (
        <CollectionsList
          data={ownedAndJoined}
          loading={loading}
          error={error}
          emptyText={t(tab === 'mine' ? 'collections.empty.mine' : 'collections.empty.pickedUp')}
          errorText={t('collections.loadError')}
          spinnerColor={colors.gold}
          cellWidth={cellWidth}
          onRefresh={refetch}
          onPressItem={(id) => router.push(`/collection/${id}`)}
        />
      )}
    </SafeAreaView>
  );
}

interface ListProps {
  data: CollectionWithProgress[];
  loading: boolean;
  error: Error | null;
  emptyText: string;
  errorText: string;
  spinnerColor: string;
  cellWidth: number;
  onRefresh: () => void;
  onPressItem: (id: string) => void;
}

function CollectionsList({
  data,
  loading,
  error,
  emptyText,
  errorText,
  spinnerColor,
  cellWidth,
  onRefresh,
  onPressItem,
}: ListProps) {
  if (loading && data.length === 0) {
    return <Spinner />;
  }
  if (error) {
    return (
      <View className="flex-1 items-center justify-center py-20 px-6">
        <Text className="text-coral text-base text-center">{errorText}</Text>
      </View>
    );
  }
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      numColumns={GRID_COLUMNS}
      columnWrapperStyle={{ gap: GRID_GAP }}
      contentContainerStyle={{
        padding: GRID_PADDING,
        gap: GRID_GAP,
        paddingBottom: 120,
      }}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={spinnerColor} />
      }
      ListEmptyComponent={<EmptyState testID="collections-empty" icon="📦" title={emptyText} />}
      renderItem={({ item }) => (
        <CollectionCard collection={item} width={cellWidth} onPress={() => onPressItem(item.id)} />
      )}
    />
  );
}
