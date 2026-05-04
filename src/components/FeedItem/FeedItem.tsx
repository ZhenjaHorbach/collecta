import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ReactionBar } from '@components/ReactionBar';
import { useReactions } from '@hooks/useReactions';
import type { FeedItem as FeedItemModel } from '@services/feed.service';

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

export interface FeedItemProps {
  item: FeedItemModel;
}

export function FeedItem({ item }: FeedItemProps) {
  const { t } = useTranslation();
  const router = useRouter();
  // Seed the local count for `fire` from the RPC's reactions_count so the
  // first paint shows the right total. The hook then re-fetches the full
  // breakdown and replaces this seed.
  const { counts, mine, toggle } = useReactions(item.findId, {
    counts: { fire: item.reactionsCount },
  });

  return (
    <View className="mb-4 overflow-hidden rounded-lg border border-stroke bg-surface">
      <Pressable
        onPress={() => router.push(`/user/${item.creatorId}`)}
        className="flex-row items-center gap-3 px-4 py-3"
        accessibilityRole="button"
        accessibilityLabel={t('feed.openProfile', { name: item.creatorDisplayName })}>
        <View className="h-10 w-10 overflow-hidden rounded-full bg-surface-hi">
          {item.creatorAvatarUrl ? (
            <Image
              source={{ uri: item.creatorAvatarUrl }}
              style={{ width: 40, height: 40 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-base font-bold text-text-dim">
                {item.creatorDisplayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-text" numberOfLines={1}>
            {item.creatorDisplayName}
          </Text>
          <Text className="text-xs text-text-dim" numberOfLines={1}>
            @{item.creatorUsername} · {formatRelative(t, item.createdAt)}
          </Text>
        </View>
        {item.sharedCollections > 0 && (
          <View className="rounded-md bg-gold-glow px-2 py-1">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-gold">
              {t('feed.sharedBadge', { count: item.sharedCollections })}
            </Text>
          </View>
        )}
      </Pressable>

      <Image
        source={{ uri: item.photoUrl }}
        style={{ width: '100%', aspectRatio: 1 }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />

      <View className="gap-3 px-4 py-3">
        <Pressable
          onPress={() => router.push(`/collection/${item.collectionId}`)}
          accessibilityRole="button"
          accessibilityLabel={t('feed.openCollection', { title: item.collectionTitle })}>
          <Text className="text-sm font-bold text-text" numberOfLines={1}>
            {item.collectionIcon ? `${item.collectionIcon} ` : ''}
            {item.collectionTitle}
          </Text>
          <Text className="text-xs text-text-dim" numberOfLines={1}>
            {item.itemName}
          </Text>
        </Pressable>

        {item.notes && (
          <Text className="text-sm leading-snug text-text" numberOfLines={4}>
            {item.notes}
          </Text>
        )}

        <ReactionBar counts={counts} mine={mine} onToggle={toggle} />
      </View>
    </View>
  );
}
