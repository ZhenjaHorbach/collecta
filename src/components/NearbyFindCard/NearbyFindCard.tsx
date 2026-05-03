import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatDistanceKm } from '@utils/geo.utils';
import type { MapFind } from '@services/finds.service';

export interface NearbyFindCardProps {
  find: MapFind;
  distanceKm: number;
  onPress: (find: MapFind) => void;
}

type TranslateFn = ReturnType<typeof useTranslation>['t'];

function formatRelative(t: TranslateFn, iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return t('map.justNow');
  if (minutes < 60) return t('map.minutesAgo', { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t('map.hoursAgo', { count: hours });
  const days = Math.round(hours / 24);
  return t('map.daysAgo', { count: days });
}

export function NearbyFindCard({ find, distanceKm, onPress }: NearbyFindCardProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => onPress(find)}
      className="flex-row items-center gap-3 rounded-lg bg-surface-hi border border-stroke p-4">
      <Image
        source={{ uri: find.photoUrl }}
        style={{ width: 54, height: 54, borderRadius: 12 }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View className="flex-1">
        <Text className="text-text text-sm font-bold" numberOfLines={1}>
          {find.itemName} · {formatDistanceKm(distanceKm)}
        </Text>
        <Text className="text-text-dim text-xs mt-0.5" numberOfLines={1}>
          {find.collectionTitle} · {formatRelative(t, find.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}
