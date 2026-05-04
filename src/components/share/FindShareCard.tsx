import { Image } from 'expo-image';
import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useColors } from '@hooks/useColors';

export interface FindShareCardProps {
  photoUrl: string;
  itemName: string;
  collectionTitle: string;
  collectionEmoji: string | null;
  creatorDisplayName: string;
  url: string;
}

export const FindShareCard = forwardRef<View, FindShareCardProps>(function FindShareCard(
  { photoUrl, itemName, collectionTitle, collectionEmoji, creatorDisplayName, url },
  ref
) {
  const colors = useColors();

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: 540,
        height: 800,
        backgroundColor: colors.bg,
      }}>
      <Image source={{ uri: photoUrl }} style={{ width: '100%', height: 540 }} contentFit="cover" />
      <View style={{ padding: 28, gap: 16, flex: 1, justifyContent: 'space-between' }}>
        <View style={{ gap: 8 }}>
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 100,
              backgroundColor: colors.goldGlow,
              borderWidth: 1,
              borderColor: colors.gold,
            }}>
            <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
              FOUND ON COLLECTA
            </Text>
          </View>
          <Text style={{ fontSize: 32, lineHeight: 38, fontWeight: '800', color: colors.text }}>
            {itemName}
          </Text>
          <Text style={{ fontSize: 16, color: colors.textDim }}>
            {collectionEmoji ? `${collectionEmoji} ` : ''}
            {collectionTitle} · by {creatorDisplayName}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ backgroundColor: '#fff', padding: 6, borderRadius: 10 }}>
            <QRCode value={url} size={80} backgroundColor="#fff" color="#000" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: colors.textDim, marginBottom: 2 }}>
              Scan to open this find
            </Text>
            <Text style={{ fontSize: 12, color: colors.text }} numberOfLines={2}>
              {url}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});
