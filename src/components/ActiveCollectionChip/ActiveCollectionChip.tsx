import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

export interface ActiveCollectionChipProps {
  collection: { id: string; title: string; icon: string | null } | null;
  onPress: () => void;
}

export function ActiveCollectionChip({
  collection,
  onPress,
}: ActiveCollectionChipProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-2 px-3 py-2 rounded-md bg-overlay-hi border border-stroke-hi self-center">
      <Text className="text-base">{collection?.icon ?? '✨'}</Text>
      <Text className="text-text text-xs font-semibold">
        {collection
          ? t('camera.chip.activeCollection', { title: collection.title })
          : t('camera.chip.autoDetect')}
      </Text>
      <Text className="text-text-dim text-[11px]">›</Text>
    </Pressable>
  );
}
