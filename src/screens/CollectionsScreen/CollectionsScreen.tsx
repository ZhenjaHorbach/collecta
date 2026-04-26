import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';

import { CollectionCard } from '@components/CollectionCard';
import { SafeAreaView } from '@components/SafeAreaView';
import { Spinner } from '@components/Spinner';
import { Tabs } from '@components/Tabs';
import { useColors } from '@hooks/useColors';
import { useMyCollections } from '@hooks/useMyCollections';
import type { CollectionWithProgress } from '@services/collections.service';

type TabKey = 'mine' | 'pickedUp';

export function CollectionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const [tab, setTab] = useState<TabKey>('mine');
  const { mine, pickedUp, loading, error, refetch } = useMyCollections();

  const tabs = useMemo(
    () =>
      [
        { key: 'mine' as const, label: t('collections.tabs.mine') },
        { key: 'pickedUp' as const, label: t('collections.tabs.pickedUp') },
      ] as const,
    [t]
  );

  const data = tab === 'mine' ? mine : pickedUp;

  return (
    <SafeAreaView>
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-text">{t('collections.title')}</Text>
        <TouchableOpacity
          onPress={() => router.push('/collection/create')}
          accessibilityRole="button"
          accessibilityLabel={t('collections.create')}
          className="px-4 py-2 rounded-full bg-gold">
          <Text className="text-on-gold font-semibold text-sm">{t('collections.create')}</Text>
        </TouchableOpacity>
      </View>
      <View className="px-5 pb-3">
        <Tabs<TabKey> options={tabs} value={tab} onChange={setTab} />
      </View>
      <CollectionsList
        data={data}
        loading={loading}
        error={error}
        emptyText={t(tab === 'mine' ? 'collections.empty.mine' : 'collections.empty.pickedUp')}
        errorText={t('collections.loadError')}
        spinnerColor={colors.gold}
        onRefresh={refetch}
        onPressItem={(id) => router.push(`/collection/${id}`)}
      />
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
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={spinnerColor} />
      }
      ListEmptyComponent={
        <View className="items-center justify-center py-20 px-6">
          <Text className="text-text-muted text-base text-center">{emptyText}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <CollectionCard collection={item} onPress={() => onPressItem(item.id)} />
      )}
    />
  );
}
