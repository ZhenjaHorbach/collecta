import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import { ProgressBar } from '@components/ProgressBar';
import { CATEGORY_EMOJI } from '@constants/categories';
import type { CollectionWithProgress } from '@services/collections.service';

export interface CollectionCardProps {
  collection: CollectionWithProgress;
  onPress: () => void;
}

export function CollectionCard({ collection, onPress }: CollectionCardProps) {
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
      className="flex-1 bg-surface rounded-lg p-4 border border-stroke active:opacity-75">
      <Text className="text-3xl mb-2">{emoji}</Text>
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
    </TouchableOpacity>
  );
}
