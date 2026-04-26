import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Share, Text, TouchableOpacity, View } from 'react-native';

import { GoBackButton } from '@components/GoBackButton';
import { ProgressBar } from '@components/ProgressBar';
import { SafeAreaView } from '@components/SafeAreaView';
import { Spinner } from '@components/Spinner';
import { CATEGORY_EMOJI } from '@constants/categories';
import { useCollection } from '@hooks/useCollection';
import type {
  CollectionDetail,
  CollectionItemWithFound,
  Find,
} from '@services/collections.service';

export function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data, loading, error } = useCollection(id);

  const headerTitle = data?.title ?? t('collections.detailTitle');

  const onShare = async () => {
    if (!data) return;
    const url = Linking.createURL(`/collection/${data.id}`);
    await Share.share({ title: data.title, message: `${data.title}\n${url}`, url });
  };

  return (
    <SafeAreaView>
      <GoBackButton>
        <Text numberOfLines={1} className="text-xl font-bold text-text flex-1">
          {headerTitle}
        </Text>
        {data ? (
          <TouchableOpacity
            onPress={onShare}
            accessibilityRole="button"
            accessibilityLabel={t('collections.share')}
            className="w-10 h-10 rounded-xl bg-surface items-center justify-center border border-stroke">
            <Text className="text-text text-base">↗</Text>
          </TouchableOpacity>
        ) : null}
      </GoBackButton>

      {loading ? (
        <Spinner />
      ) : error || !data ? (
        <View className="flex-1 items-center justify-center py-20 px-6">
          <Text className="text-coral text-base text-center">{t('collections.loadError')}</Text>
        </View>
      ) : (
        <DetailBody data={data} />
      )}
    </SafeAreaView>
  );
}

function DetailBody({ data }: { data: CollectionDetail }) {
  const { t } = useTranslation();

  const findByItem = useMemo(() => {
    const map = new Map<string, Find>();
    for (const f of data.finds) {
      if (!map.has(f.collection_item_id)) map.set(f.collection_item_id, f);
    }
    return map;
  }, [data.finds]);

  const total = data.items.length;
  const found = data.items.filter((i) => i.found).length;
  const progress = total > 0 ? found / total : 0;
  const headerEmoji = data.icon ?? (data.category ? CATEGORY_EMOJI[data.category] : '📦');

  return (
    <FlatList
      data={data.items}
      keyExtractor={(item) => item.id}
      numColumns={3}
      columnWrapperStyle={{ gap: 8 }}
      contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 120 }}
      ListHeaderComponent={
        <View className="mb-4">
          <View className="bg-surface-lo rounded-lg p-5 border border-stroke">
            <Text className="text-5xl mb-2">{headerEmoji}</Text>
            <Text className="text-2xl font-bold text-text">{data.title}</Text>
            {data.category ? (
              <View className="self-start mt-2 px-3 py-1 rounded-full bg-surface-hi">
                <Text className="text-xs text-text-dim font-semibold">
                  {t(`categories.${data.category}`)}
                </Text>
              </View>
            ) : null}
            {data.description ? (
              <Text className="text-sm text-text-dim mt-3">{data.description}</Text>
            ) : null}
            {!data.is_freeform ? (
              <View className="mt-4 gap-1">
                <ProgressBar value={progress} />
                <Text className="text-xs text-text-muted">
                  {t('collections.progress', { found, total })}
                </Text>
              </View>
            ) : (
              <Text className="mt-4 text-xs text-text-muted">{t('collections.freeform')}</Text>
            )}
          </View>
          {!data.is_freeform && data.items.length > 0 ? (
            <Text className="mt-5 text-xs uppercase tracking-wider text-text-dim font-semibold">
              {t('collections.items.header')}
            </Text>
          ) : null}
        </View>
      }
      renderItem={({ item }) => <ItemCell item={item} find={findByItem.get(item.id)} />}
    />
  );
}

function ItemCell({ item, find }: { item: CollectionItemWithFound; find: Find | undefined }) {
  const photo = find?.photo_url ?? item.example_image_url;

  return (
    <View
      className={`flex-1 aspect-square rounded-md overflow-hidden bg-surface border border-stroke ${item.found ? '' : 'opacity-40'}`}>
      {photo ? (
        <Image source={{ uri: photo }} style={{ flex: 1 }} contentFit="cover" />
      ) : (
        <View className="flex-1 items-center justify-center bg-surface-hi">
          <Text className="text-3xl">📷</Text>
        </View>
      )}
      <View className="absolute left-0 right-0 bottom-0 px-2 py-1 bg-overlay">
        <Text numberOfLines={1} className="text-xs text-text font-semibold">
          {item.name}
        </Text>
      </View>
    </View>
  );
}
