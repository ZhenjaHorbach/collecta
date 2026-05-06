import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@components/BottomSheet';
import { Spinner } from '@components/Spinner';

import type { CollectionWithProgress } from '@services/collections.service';

export interface ChooseCollectionSheetProps {
  visible: boolean;
  collections: CollectionWithProgress[];
  loading: boolean;
  activeCollectionId: string | null;
  onPick: (id: string | null) => void;
  onClose: () => void;
}

export function ChooseCollectionSheet({
  visible,
  collections,
  loading,
  activeCollectionId,
  onPick,
  onClose,
}: ChooseCollectionSheetProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      showHandle={false}
      contentClassName="bg-bg rounded-t-xl p-4 gap-3 max-h-[70%]">
      <View className="flex-row items-center justify-between">
        <Text className="text-text text-base font-semibold">
          {t('camera.chip.chooseCollection')}
        </Text>
        <Pressable onPress={onClose} className="px-3 py-1 rounded-full bg-surface-hi">
          <Text className="text-text text-xs">{t('common.close')}</Text>
        </Pressable>
      </View>

      {loading ? (
        <Spinner />
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={
            <Pressable
              onPress={() => {
                onPick(null);
                onClose();
              }}
              className={`flex-row items-center gap-3 px-3 py-3 rounded-md border ${
                activeCollectionId === null
                  ? 'bg-gold-glow border-gold'
                  : 'bg-surface border-stroke'
              } mb-2`}>
              <Text className="text-base">✨</Text>
              <View className="flex-1">
                <Text className="text-text text-sm font-semibold">
                  {t('camera.chip.autoDetect')}
                </Text>
                <Text className="text-text-dim text-[11px]">{t('camera.chip.autoDetectHint')}</Text>
              </View>
            </Pressable>
          }
          ItemSeparatorComponent={() => <View className="h-1.5" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onPick(item.id);
                onClose();
              }}
              className={`flex-row items-center gap-3 px-3 py-3 rounded-md border ${
                item.id === activeCollectionId
                  ? 'bg-gold-glow border-gold'
                  : 'bg-surface border-stroke'
              }`}>
              <Text className="text-base">{item.icon ?? '📚'}</Text>
              <View className="flex-1">
                <Text className="text-text text-sm font-semibold" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="text-text-dim text-[11px]">
                  {item.found_count}/{item.items_count}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="text-text-dim text-sm text-center py-6">
              {t('camera.noCollections')}
            </Text>
          }
        />
      )}
    </BottomSheet>
  );
}
