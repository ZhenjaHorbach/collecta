import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import { ProgressBar } from '@components/ProgressBar';
import { CATEGORY_EMOJI } from '@constants/categories';
import type { CollectionWithProgress } from '@services/collections.service';

export interface CollectionCardProps {
  collection: CollectionWithProgress;
  onPress: () => void;
  // Optional fixed width so the card doesn't stretch when it's the lone
  // trailing tile in an odd-count two-column FlatList. Pass the cell width
  // computed from useWindowDimensions in the parent. Falls back to flex-1
  // for callers that still want auto-sizing.
  width?: number;
}

export function CollectionCard({ collection, onPress, width }: CollectionCardProps) {
  const { t } = useTranslation();
  const total = collection.items_count;
  const found = collection.found_count;
  const progress = total > 0 ? found / total : 0;
  const emoji =
    collection.icon ?? (collection.category ? CATEGORY_EMOJI[collection.category] : '📦');

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      style={width !== undefined ? { width } : undefined}
      className={`${width === undefined ? 'flex-1' : ''} bg-surface rounded-lg border border-stroke active:opacity-75 overflow-hidden`}>
      {collection.cover_image_url ? (
        <View className="w-full h-24 bg-surface-hi">
          <Image
            source={{ uri: collection.cover_image_url }}
            style={{ flex: 1 }}
            contentFit="cover"
          />
        </View>
      ) : (
        <View className="w-full h-24 bg-surface-hi items-center justify-center">
          <Text className="text-4xl">{emoji}</Text>
        </View>
      )}
      <View className="p-4">
        <Text numberOfLines={1} className="text-base font-semibold text-text">
          {collection.title}
        </Text>
        {collection.description ? (
          <Text numberOfLines={2} className="text-xs text-text-dim mt-1">
            {collection.description}
          </Text>
        ) : null}
        <View className="mt-3 gap-1">
          <ProgressBar value={progress} />
          <Text className="text-xs text-text-muted">
            {collection.is_freeform
              ? t('collections.freeform')
              : t('collections.progress', { found, total })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
