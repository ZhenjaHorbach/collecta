import { Image } from 'expo-image';
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export interface CollectionShareCardProps {
  title: string;
  emoji: string | null;
  coverUrl: string | null;
  itemsCount: number;
  url: string;
}

// Renders off-screen for view-shot capture. Fixed dimensions so the captured
// PNG is consistent regardless of viewport. Width 540 → 1080 at scale 2.
export const CollectionShareCard = forwardRef<View, CollectionShareCardProps>(
  function CollectionShareCard({ title, emoji, coverUrl, itemsCount, url }, ref) {
    const { t } = useTranslation();

    return (
      <View ref={ref} collapsable={false} className="w-[540px] h-[720px] bg-bg p-8 justify-between">
        <View className="gap-4">
          <View className="self-start px-3 py-1.5 rounded-full bg-gold">
            <Text className="text-on-gold text-sm font-extrabold">{t('share.brand')}</Text>
          </View>
          <Text className="text-[44px] leading-[50px] font-extrabold text-text">
            {emoji ? `${emoji} ` : ''}
            {title}
          </Text>
          <Text className="text-lg text-text-dim">
            {t('share.itemsToFind', { count: itemsCount })}
          </Text>
        </View>

        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={{ width: '100%', height: 280, borderRadius: 24 }}
            contentFit="cover"
          />
        ) : (
          <View className="w-full h-[280px] rounded-lg bg-surface items-center justify-center">
            <Text className="text-[96px]">{emoji ?? '📦'}</Text>
          </View>
        )}

        <View className="flex-row items-center gap-4">
          <View style={{ backgroundColor: '#fff', padding: 8, borderRadius: 12 }}>
            <QRCode value={url} size={88} backgroundColor="#fff" color="#000" />
          </View>
          <View className="flex-1">
            <Text className="text-sm text-text-dim mb-1">{t('share.scanCollection')}</Text>
            <Text className="text-[13px] text-text" numberOfLines={2}>
              {url}
            </Text>
          </View>
        </View>
      </View>
    );
  }
);
