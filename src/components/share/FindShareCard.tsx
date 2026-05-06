import { Image } from 'expo-image';
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { ShareQr } from './ShareQr';

export interface FindShareCardProps {
  photoUrl: string;
  itemName: string;
  collectionTitle: string;
  collectionEmoji: string | null;
  creatorDisplayName: string;
  url: string;
}

// Renders off-screen for view-shot capture. Fixed dimensions so the captured
// PNG is consistent regardless of viewport.
export const FindShareCard = forwardRef<View, FindShareCardProps>(function FindShareCard(
  { photoUrl, itemName, collectionTitle, collectionEmoji, creatorDisplayName, url },
  ref
) {
  const { t } = useTranslation();

  return (
    <View ref={ref} collapsable={false} className="w-[540px] h-[800px] bg-bg">
      <Image source={{ uri: photoUrl }} style={{ width: '100%', height: 540 }} contentFit="cover" />
      <View className="p-7 gap-4 flex-1 justify-between">
        <View className="gap-2">
          <View className="self-start px-2.5 py-1 rounded-full bg-gold-glow border border-gold">
            <Text className="text-gold text-[11px] font-extrabold tracking-widest">
              {t('share.foundOnCollecta')}
            </Text>
          </View>
          <Text className="text-[32px] leading-[38px] font-extrabold text-text">{itemName}</Text>
          <Text className="text-base text-text-dim">
            {collectionEmoji ? `${collectionEmoji} ` : ''}
            {t('share.collectionByAuthor', {
              collection: collectionTitle,
              author: creatorDisplayName,
            })}
          </Text>
        </View>

        <View className="flex-row items-center gap-3.5">
          <ShareQr value={url} size={80} padding={6} borderRadius={10} />
          <View className="flex-1">
            <Text className="text-[13px] text-text-dim mb-0.5">{t('share.scanFind')}</Text>
            <Text className="text-xs text-text" numberOfLines={2}>
              {url}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});
