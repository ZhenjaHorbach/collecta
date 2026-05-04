import { Image } from 'expo-image';
import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useColors } from '@hooks/useColors';

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
    const colors = useColors();

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width: 540,
          height: 720,
          backgroundColor: colors.bg,
          padding: 32,
          gap: 20,
          justifyContent: 'space-between',
        }}>
        <View style={{ gap: 16 }}>
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 100,
              backgroundColor: colors.gold,
            }}>
            <Text style={{ color: colors.onGold, fontSize: 14, fontWeight: '800' }}>COLLECTA</Text>
          </View>
          <Text style={{ fontSize: 44, lineHeight: 50, fontWeight: '800', color: colors.text }}>
            {emoji ? `${emoji} ` : ''}
            {title}
          </Text>
          <Text style={{ fontSize: 18, color: colors.textDim }}>{itemsCount} items to find</Text>
        </View>

        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={{ width: '100%', height: 280, borderRadius: 24 }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 280,
              borderRadius: 24,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 96 }}>{emoji ?? '📦'}</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ backgroundColor: '#fff', padding: 8, borderRadius: 12 }}>
            <QRCode value={url} size={88} backgroundColor="#fff" color="#000" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: colors.textDim, marginBottom: 4 }}>
              Scan to start collecting
            </Text>
            <Text style={{ fontSize: 13, color: colors.text }} numberOfLines={2}>
              {url}
            </Text>
          </View>
        </View>
      </View>
    );
  }
);
