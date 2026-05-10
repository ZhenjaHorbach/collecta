import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActionSheetIOS,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type View as RNView,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { actionSheet, notify } from '@components/ConfirmDialog';
import { GoBackButton } from '@components/GoBackButton';
import { ReactionBar } from '@components/ReactionBar';
import { ReportSheet } from '@components/ReportSheet';
import { SafeAreaView } from '@components/SafeAreaView';
import { Spinner } from '@components/Spinner';
import { MapPreview } from '@components/MapPreview';
import { FindShareCard } from '@components/share';
import { CATEGORY_EMOJI, type CollectionCategory } from '@constants/categories';
import { MAX_CONTENT_WIDTH } from '@constants/layout';
import { useAuth } from '@hooks/useAuth';
import { useFindDetail } from '@hooks/useFindDetail';
import { useReactions } from '@hooks/useReactions';
import { useReport } from '@hooks/useReport';
import { useReverseGeocode } from '@hooks/useReverseGeocode';
import type { ReportError, ReportReason } from '@services/moderation.service';
import { shareCardImage } from '@services/share.service';
import { formatFindDateTime } from '@utils/datetime.utils';
import { formatCoords } from '@utils/geocode.utils';
import { buildFindUrl } from '@utils/links.utils';

type TranslateFn = ReturnType<typeof useTranslation>['t'];

export function FindDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { data, reactions, loading, error } = useFindDetail(id);
  const isOwner = !!user && !!data && user.id === data.find.user_id;
  const { submit: submitReport, submitting: reporting, reset: resetReport } = useReport();
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const shareCardRef = useRef<RNView>(null);

  const headerTitle = data?.item.name ?? t('find.headerTitle');

  const onPressMore = useCallback(() => {
    const openSheet = () => {
      resetReport();
      setReportSheetOpen(true);
    };
    const onRetake = () => {
      if (!data) return;
      router.push(`/(tabs)/camera?collection_item_id=${data.item.id}`);
    };

    const labels: string[] = [t('common.close')];
    const handlers: (() => void)[] = [() => {}];
    if (isOwner) {
      labels.push(t('find.retake'));
      handlers.push(onRetake);
    }
    labels.push(t('find.report'));
    handlers.push(openSheet);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: labels,
          cancelButtonIndex: 0,
          destructiveButtonIndex: labels.length - 1,
        },
        (selected) => {
          handlers[selected]?.();
        }
      );
      return;
    }
    // labels[0] / handlers[0] is the cancel slot — actionSheet has its own
    // cancel button, so skip it and pass labels 1..n.
    void actionSheet({
      title: t('moderation.report.more'),
      cancelLabel: t('common.close'),
      actions: labels.slice(1).map((label, idx) => ({
        label,
        destructive: idx === labels.length - 2, // last is "report"
      })),
    }).then((picked) => {
      if (picked == null) return;
      handlers[picked + 1]?.();
    });
  }, [data, isOwner, resetReport, router, t]);

  const onSubmitReport = useCallback(
    async (reason: ReportReason, comment: string) => {
      if (!data) return;
      const err = await submitReport({
        target: 'find',
        targetId: data.find.id,
        reason,
        comment: comment.trim() || undefined,
      });
      if (!err) {
        setReportSheetOpen(false);
        void notify({
          title: t('moderation.report.successTitle'),
          body: t('moderation.report.successBody'),
          buttonLabel: t('common.close'),
        });
        return;
      }
      if (err.code === 'already_reported') {
        setReportSheetOpen(false);
        void notify({
          title: t('moderation.report.successTitle'),
          body: t('moderation.report.errors.alreadyReported'),
          buttonLabel: t('common.close'),
        });
        return;
      }
      void notify({
        title: t('common.unknownError'),
        body: t(reportErrorKey(err)),
        buttonLabel: t('common.close'),
      });
    },
    [data, submitReport, t]
  );

  const onShare = useCallback(async () => {
    if (!data) return;
    void Haptics.selectionAsync();
    const url = buildFindUrl(data.find.id);
    await shareCardImage(shareCardRef, {
      message: t('find.shareFindMessage', {
        item: data.item.name,
        collection: data.collection.title,
      }),
      url,
      dialogTitle: t('find.shareFind'),
    });
  }, [data, t]);

  return (
    <SafeAreaView testID="find-detail-screen">
      <GoBackButton>
        <Text numberOfLines={1} className="text-xl font-bold text-text flex-1">
          {headerTitle}
        </Text>
        {data ? (
          <View className="flex-row gap-2">
            <TouchableOpacity
              testID="find-share-button"
              onPress={onShare}
              accessibilityRole="button"
              accessibilityLabel={t('find.share')}
              className="w-10 h-10 rounded-md bg-surface items-center justify-center border border-stroke">
              <Text className="text-text text-base">↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="find-more-button"
              onPress={onPressMore}
              accessibilityRole="button"
              accessibilityLabel={t('moderation.report.more')}
              className="w-10 h-10 rounded-md bg-surface items-center justify-center border border-stroke">
              <Text className="text-text text-base">⋯</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </GoBackButton>

      {loading ? (
        <Spinner />
      ) : error || !data ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-coral text-base text-center">{t('find.loadError')}</Text>
        </View>
      ) : (
        <DetailBody
          data={data}
          initialReactions={reactions}
          router={router}
          shareCardRef={shareCardRef}
          t={t}
        />
      )}

      <ReportSheet
        visible={reportSheetOpen}
        submitting={reporting}
        onSubmit={onSubmitReport}
        onClose={() => setReportSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

function reportErrorKey(err: ReportError): string {
  switch (err.code) {
    case 'network':
    case 'unauthorized':
      return 'moderation.report.errors.network';
    default:
      return 'moderation.report.errors.unknown';
  }
}

interface DetailBodyProps {
  data: NonNullable<ReturnType<typeof useFindDetail>['data']>;
  initialReactions: ReturnType<typeof useFindDetail>['reactions'];
  router: ReturnType<typeof useRouter>;
  shareCardRef: React.RefObject<RNView | null>;
  t: TranslateFn;
}

function DetailBody({ data, initialReactions, router, shareCardRef, t }: DetailBodyProps) {
  const { find, creator, collection, item } = data;
  const aggregate = initialReactions ?? undefined;
  const { counts, mine, toggle } = useReactions(find.id, aggregate);
  const { label: locationLabel } = useReverseGeocode(find.location_lat, find.location_lng);

  const aiPercent = useMemo(
    () => (find.ai_confidence != null ? Math.round(find.ai_confidence * 100) : null),
    [find.ai_confidence]
  );

  const hasLocation = find.location_lat != null && find.location_lng != null;
  const collectionEmoji =
    collection.icon ?? (collection.category ? CATEGORY_EMOJI[collection.category] : null);
  const findUrl = buildFindUrl(find.id);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <HeroPhoto
        photoUrl={find.photo_url}
        aiPercent={aiPercent}
        aiLabel={t('find.aiBadge', { percent: aiPercent ?? 0 })}
      />

      <View className="px-4 pt-4 gap-4">
        <Pressable
          testID="find-collection-link"
          onPress={() => router.push(`/collection/${collection.id}`)}
          accessibilityRole="button"
          accessibilityLabel={t('find.openCollection', { title: collection.title })}
          className="flex-row items-center gap-3 rounded-md bg-surface border border-stroke p-3">
          <View className="w-10 h-10 rounded-md bg-surface-hi items-center justify-center">
            <Text className="text-xl">{collectionEmoji ?? '📦'}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
              {t('find.inCollection')}
            </Text>
            <Text className="text-sm font-bold text-text" numberOfLines={1}>
              {collection.title}
            </Text>
          </View>
          <Text className="text-text-dim">›</Text>
        </Pressable>

        <Pressable
          testID="find-creator-link"
          onPress={() => router.push(`/user/${creator.id}`)}
          accessibilityRole="button"
          accessibilityLabel={t('find.openProfile', { name: creator.displayName })}
          className="flex-row items-center gap-3">
          <View className="h-10 w-10 overflow-hidden rounded-full bg-surface-hi">
            {creator.avatarUrl ? (
              <Image
                source={{ uri: creator.avatarUrl }}
                style={{ width: 40, height: 40 }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Text className="text-base font-bold text-text-dim">
                  {creator.displayName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-text" numberOfLines={1}>
              {creator.displayName}
            </Text>
            <Text className="text-xs text-text-dim" numberOfLines={1}>
              @{creator.username}
              {creator.level != null
                ? ` · ${t('profile.levelBadge', { level: creator.level })}`
                : ''}
            </Text>
          </View>
        </Pressable>

        {find.notes ? (
          <Text className="text-sm leading-snug text-text">{find.notes}</Text>
        ) : (
          <Text className="text-sm italic text-text-muted">{t('find.notesPlaceholder')}</Text>
        )}

        <ReactionBar
          counts={counts}
          mine={mine}
          onToggle={toggle}
          testIDPrefix={`find-detail-${find.id}-reaction`}
        />

        <View className="flex-row gap-2">
          <MetaCard
            label={t('find.meta.location')}
            primary={
              locationLabel ??
              (hasLocation
                ? formatCoords(find.location_lat!, find.location_lng!)
                : t('find.meta.noLocation'))
            }
            secondary={
              hasLocation && locationLabel
                ? t('find.meta.coords', {
                    lat: find.location_lat!.toFixed(4),
                    lng: find.location_lng!.toFixed(4),
                  })
                : null
            }
          />
          <MetaCard
            label={t('find.meta.captured')}
            primary={formatFindDateTime(find.created_at)}
            secondary={null}
          />
        </View>

        {hasLocation ? (
          <MapPreview
            lat={find.location_lat!}
            lng={find.location_lng!}
            photoUrl={find.photo_url}
            emoji={collectionEmoji}
            category={collection.category ?? ('urban' as CollectionCategory)}
            label={locationLabel ?? formatCoords(find.location_lat!, find.location_lng!)}
            openMapLabel={t('find.openInMap')}
            onOpenMap={() =>
              router.push(`/(tabs)/map?lat=${find.location_lat}&lng=${find.location_lng}`)
            }
          />
        ) : null}
      </View>

      <View pointerEvents="none" className="absolute -left-[9999px] -top-[9999px] opacity-0">
        <FindShareCard
          ref={shareCardRef}
          photoUrl={find.photo_url}
          itemName={item.name}
          collectionTitle={collection.title}
          collectionEmoji={collectionEmoji}
          creatorDisplayName={creator.displayName}
          url={findUrl}
        />
      </View>
    </ScrollView>
  );
}

interface HeroPhotoProps {
  photoUrl: string;
  aiPercent: number | null;
  aiLabel: string;
}

// Hero photo aspect: phone-like 1:1.1 (W:H). Capped at HERO_MAX_HEIGHT so
// the photo doesn't eat the full viewport on tablets / desktop web; the
// width is also capped via SafeAreaView's MAX_CONTENT_WIDTH so the cap
// triggers naturally above ~545 px viewport width.
const HERO_ASPECT = 1.1;
const HERO_MAX_HEIGHT = 600;

function HeroPhoto({ photoUrl, aiPercent, aiLabel }: HeroPhotoProps) {
  const scale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const baseScale = useSharedValue(1);
  const { width: rawWidth } = useWindowDimensions();
  // Computed pixel height — explicit because RN-Web's percentage `height: 100%`
  // doesn't reliably resolve against an `aspect-ratio`-derived parent height,
  // which left the inner image collapsed (rendered, but 0 px tall).
  const heroWidth = Math.min(rawWidth, MAX_CONTENT_WIDTH);
  const heroHeight = Math.min(heroWidth * HERO_ASPECT, HERO_MAX_HEIGHT);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(4, baseScale.value * e.scale));
      focalX.value = e.focalX;
      focalY.value = e.focalY;
    })
    .onEnd(() => {
      baseScale.value = scale.value;
      if (scale.value < 1.05) {
        scale.value = withTiming(1);
        baseScale.value = 1;
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={{ height: heroHeight }} className="overflow-hidden bg-surface">
      <GestureDetector gesture={pinch}>
        {/* Inline width/height instead of className — NativeWind's className
            resolution doesn't always reach Animated.View's underlying div on
            web, leaving the img-host with no height and the photo invisible
            despite loading successfully. Inline + animatedStyle still composes
            via Reanimated. */}
        <Animated.View style={[{ width: '100%', height: '100%' }, animatedStyle]}>
          <Image
            source={{ uri: photoUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      </GestureDetector>

      {aiPercent != null ? (
        <View className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-overlay border border-gold flex-row items-center gap-1">
          <Text className="text-gold text-xs font-bold tracking-wide">{aiLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

interface MetaCardProps {
  label: string;
  primary: string;
  secondary: string | null;
}

function MetaCard({ label, primary, secondary }: MetaCardProps) {
  return (
    <View className="flex-1 rounded-md bg-surface border border-stroke p-3 gap-1">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-text-dim">{label}</Text>
      <Text className="text-sm font-bold text-text" numberOfLines={2}>
        {primary}
      </Text>
      {secondary ? (
        <Text className="text-xs text-text-muted" numberOfLines={1}>
          {secondary}
        </Text>
      ) : null}
    </View>
  );
}
