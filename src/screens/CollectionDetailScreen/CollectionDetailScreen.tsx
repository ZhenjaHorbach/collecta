import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Share,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { GoBackButton } from '@components/GoBackButton';
import { ProgressBar } from '@components/ProgressBar';
import { ReportSheet } from '@components/ReportSheet';
import { SafeAreaView } from '@components/SafeAreaView';
import { Spinner } from '@components/Spinner';
import { CATEGORY_EMOJI } from '@constants/categories';
import { useAuth } from '@hooks/useAuth';
import { useCollection } from '@hooks/useCollection';
import { useDeleteCollection } from '@hooks/useDeleteCollection';
import { useForkCollection } from '@hooks/useForkCollection';
import { useReport } from '@hooks/useReport';
import type {
  CollectionDetail,
  CollectionItemWithFound,
  Find,
} from '@services/collections.service';
import type { ReportError, ReportReason } from '@services/moderation.service';

export function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, loading, error } = useCollection(id);
  const isOwner = !!user && !!data && data.creator_id === user.id;
  const { submit: submitReport, submitting: reporting, reset: resetReport } = useReport();
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  // `error` from the hook isn't read directly — failures surface via
  // run() returning false and the inline Alert below.
  const { pending: deleting, run: runDelete } = useDeleteCollection();

  const headerTitle = data?.title ?? t('collections.detailTitle');

  const onShare = async () => {
    if (!data) return;
    const url = Linking.createURL(`/collection/${data.id}`);
    await Share.share({ title: data.title, message: `${data.title}\n${url}`, url });
  };

  const openReportSheet = () => {
    resetReport();
    setReportSheetOpen(true);
  };

  const onConfirmDelete = () => {
    if (!data) return;
    Alert.alert(t('collections.delete.confirmTitle'), t('collections.delete.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('collections.delete.confirmAction'),
        style: 'destructive',
        onPress: async () => {
          const ok = await runDelete(data.id);
          if (ok) {
            router.replace('/(tabs)/collections');
            return;
          }
          Alert.alert(t('collections.delete.errorTitle'), t('collections.delete.errorBody'));
        },
      },
    ]);
  };

  const onPressMore = () => {
    // Owner sees Edit + Delete instead of Report — owners can't report
    // their own collection (RLS-enforced, no point showing the option).
    // Edit is the safe primary action; Delete stays destructive and
    // last in the list so a misfire is unlikely.
    const ownerOptions = [
      t('common.close'),
      t('collections.edit.trigger'),
      t('collections.delete.trigger'),
    ];
    const reporterOptions = [t('common.close'), t('moderation.report.trigger')];
    const options = isOwner ? ownerOptions : reporterOptions;
    const onSelected = (selected: number) => {
      if (selected === 0) return;
      if (isOwner) {
        if (selected === 1) {
          if (data) router.push(`/collection/edit/${data.id}`);
          return;
        }
        if (selected === 2) onConfirmDelete();
        return;
      }
      if (selected === 1) openReportSheet();
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: isOwner ? 2 : 1,
        },
        onSelected
      );
      return;
    }
    if (isOwner) {
      Alert.alert(t('moderation.report.more'), undefined, [
        { text: t('common.close'), style: 'cancel' },
        { text: options[1], onPress: () => onSelected(1) },
        { text: options[2], style: 'destructive', onPress: () => onSelected(2) },
      ]);
      return;
    }
    Alert.alert(t('moderation.report.more'), undefined, [
      { text: t('common.close'), style: 'cancel' },
      {
        text: options[1],
        style: 'destructive',
        onPress: () => onSelected(1),
      },
    ]);
  };

  const onSubmitReport = async (reason: ReportReason, comment: string) => {
    if (!data) return;
    const err = await submitReport({
      target: 'collection',
      targetId: data.id,
      reason,
      comment: comment.trim() || undefined,
    });
    if (!err) {
      setReportSheetOpen(false);
      Alert.alert(t('moderation.report.successTitle'), t('moderation.report.successBody'));
      return;
    }
    if (err.code === 'already_reported') {
      setReportSheetOpen(false);
      Alert.alert(
        t('moderation.report.successTitle'),
        t('moderation.report.errors.alreadyReported')
      );
      return;
    }
    Alert.alert(t('common.unknownError'), t(reportErrorKey(err)));
  };

  return (
    <SafeAreaView testID="collection-detail-screen">
      <GoBackButton>
        <Text numberOfLines={1} className="text-xl font-bold text-text flex-1">
          {headerTitle}
        </Text>
        {data ? (
          <View className="flex-row gap-2">
            <TouchableOpacity
              testID="collection-share-button"
              onPress={onShare}
              accessibilityRole="button"
              accessibilityLabel={t('collections.share')}
              className="w-10 h-10 rounded-xl bg-surface items-center justify-center border border-stroke">
              <Text className="text-text text-base">↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="collection-more-button"
              onPress={onPressMore}
              accessibilityRole="button"
              accessibilityLabel={t('moderation.report.more')}
              className="w-10 h-10 rounded-xl bg-surface items-center justify-center border border-stroke">
              <Text className="text-text text-base">⋯</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </GoBackButton>

      {loading ? (
        <Spinner />
      ) : error || !data ? (
        <View className="flex-1 items-center justify-center py-20 px-6">
          <Text className="text-coral text-base text-center">{t('collections.loadError')}</Text>
        </View>
      ) : (
        <DetailBody data={data} isOwner={isOwner} />
      )}

      <ReportSheet
        visible={reportSheetOpen}
        submitting={reporting}
        onSubmit={onSubmitReport}
        onClose={() => setReportSheetOpen(false)}
      />

      {deleting ? (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={t('collections.delete.pending')}
          className="absolute top-0 left-0 right-0 bottom-0 bg-overlay items-center justify-center">
          <Spinner />
          <Text className="mt-3 text-sm text-text font-semibold">
            {t('collections.delete.pending')}
          </Text>
        </View>
      ) : null}
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

const GRID_COLUMNS = 3;
const GRID_PADDING = 16;
const GRID_GAP = 8;

function DetailBody({ data, isOwner }: { data: CollectionDetail; isOwner: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const cellSize = (screenWidth - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  const fork = useForkCollection(isOwner ? undefined : data.id, data.creator_id);

  const onFork = async () => {
    const newId = await fork.fork();
    if (newId) {
      Alert.alert(t('collections.fork.successToastTitle'), t('collections.fork.successToastBody'));
      router.replace(`/collection/${newId}`);
      return;
    }
    if (fork.error) {
      Alert.alert(t('collections.fork.errorTitle'), t('collections.fork.errorBody'));
    }
  };

  const findByItem = useMemo(() => {
    const map = new Map<string, Find>();
    for (const f of data.finds) {
      if (!map.has(f.collection_item_id)) map.set(f.collection_item_id, f);
    }
    return map;
  }, [data.finds]);

  const referenceFindByItem = useMemo(() => {
    const map = new Map<string, Find>();
    for (const f of data.referenceFinds) {
      if (!map.has(f.collection_item_id)) map.set(f.collection_item_id, f);
    }
    return map;
  }, [data.referenceFinds]);

  const total = data.items.length;
  // Owner: only own finds count toward "found" (referenceFinds is empty).
  // Non-owner: count cells that have either an own find or the creator's
  // reference find — i.e. anything visibly filled in the grid. Without this
  // a viewer sees photos in cells but the counter reads 0 / N.
  const found = data.items.filter(
    (i) => findByItem.has(i.id) || referenceFindByItem.has(i.id)
  ).length;
  const progress = total > 0 ? found / total : 0;
  const headerEmoji = data.icon ?? (data.category ? CATEGORY_EMOJI[data.category] : '📦');

  return (
    <FlatList
      data={data.items}
      keyExtractor={(item) => item.id}
      numColumns={GRID_COLUMNS}
      columnWrapperStyle={{ gap: GRID_GAP }}
      contentContainerStyle={{ padding: GRID_PADDING, gap: GRID_GAP, paddingBottom: 120 }}
      ListHeaderComponent={
        <View className="mb-4">
          <View className="bg-surface-lo rounded-lg p-5 border border-stroke">
            <Text className="text-5xl mb-2">{headerEmoji}</Text>
            <Text className="text-2xl font-bold text-text">{data.title}</Text>
            {data.category ? (
              <View className="self-start mt-2 px-3 py-1 rounded-full bg-surface-hi">
                <Text className="text-xs text-text-dim font-semibold">
                  {t(`categories.${data.category}`)}
                </Text>
              </View>
            ) : null}
            {isOwner && data.forkedFromTitle ? (
              <View className="self-start mt-2 px-3 py-1 rounded-full bg-gold-glow border border-gold-lo">
                <Text className="text-xs text-text font-semibold">
                  {t('collections.fork.forkedBadge', { title: data.forkedFromTitle })}
                </Text>
              </View>
            ) : null}
            {data.description ? (
              <Text className="text-sm text-text-dim mt-3">{data.description}</Text>
            ) : null}
            {!data.is_freeform ? (
              <View className="mt-4 gap-1">
                <ProgressBar value={progress} />
                <Text className="text-xs text-text-muted">
                  {t('collections.progress', { found, total })}
                </Text>
              </View>
            ) : (
              <Text className="mt-4 text-xs text-text-muted">{t('collections.freeform')}</Text>
            )}
          </View>
          {!isOwner ? (
            <ForkPanel
              fork={fork}
              onFork={onFork}
              onOpenMine={(id) => router.replace(`/collection/${id}`)}
            />
          ) : null}
          {!data.is_freeform && data.items.length > 0 ? (
            <Text className="mt-5 text-xs uppercase tracking-wider text-text-dim font-semibold">
              {t('collections.items.header')}
            </Text>
          ) : null}
        </View>
      }
      renderItem={({ item }) => {
        const ownFind = findByItem.get(item.id);
        const refFind = referenceFindByItem.get(item.id);
        const displayFind = ownFind ?? refFind;
        // Non-owners can't shoot photos for someone else's collection — empty
        // cells stay non-interactive. Owner sees camera entry as before.
        const disabled = !isOwner && !ownFind && !refFind;
        return (
          <ItemCell
            item={item}
            find={displayFind}
            size={cellSize}
            disabled={disabled}
            onPress={() => {
              if (ownFind) router.push(`/find/${ownFind.id}`);
              else if (refFind) router.push(`/find/${refFind.id}`);
              else if (isOwner) router.push(`/(tabs)/camera?collection_item_id=${item.id}`);
            }}
          />
        );
      }}
      ListFooterComponent={isOwner ? <CreatorHintsPanel items={data.items} /> : null}
    />
  );
}

function CreatorHintsPanel({ items }: { items: CollectionItemWithFound[] }) {
  const { t } = useTranslation();
  const withHints = items.filter(
    (i) => i.description || i.ai_validation_prompt || i.fun_fact || i.rarity
  );
  if (withHints.length === 0) return null;

  return (
    <View className="mt-8">
      <View className="flex-row items-center mb-2 gap-2">
        <Text className="text-xs uppercase tracking-wider text-text-dim font-semibold">
          {t('collections.detail.creatorHints.title')}
        </Text>
        <View className="px-2 py-0.5 rounded-full bg-gold-lo border border-gold">
          <Text className="text-[10px] font-bold text-text uppercase">
            {t('collections.detail.creatorHints.badge')}
          </Text>
        </View>
      </View>
      <Text className="text-xs text-text-muted mb-3 leading-5">
        {t('collections.detail.creatorHints.subtitle')}
      </Text>
      <View className="gap-2">
        {withHints.map((item) => (
          <CreatorHintRow key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}

function CreatorHintRow({ item }: { item: CollectionItemWithFound }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <View className="rounded-md bg-surface-lo border border-stroke">
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="px-3 py-3 flex-row items-center gap-2">
        <Text className="flex-1 text-sm font-semibold text-text" numberOfLines={1}>
          {item.name}
        </Text>
        <View className="px-2 py-0.5 rounded-full bg-surface-hi">
          <Text className="text-[10px] font-bold text-text-dim uppercase">
            {t(`collections.rarity.${item.rarity}`)}
          </Text>
        </View>
        <Text className="text-text-dim text-xs">{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {open ? (
        <View className="px-3 pb-3 gap-2 border-t border-stroke">
          {item.description ? (
            <HintRow
              label={t('collections.detail.creatorHints.fields.description')}
              value={item.description}
            />
          ) : null}
          {item.ai_validation_prompt ? (
            <HintRow
              label={t('collections.detail.creatorHints.fields.aiHint')}
              value={item.ai_validation_prompt}
            />
          ) : null}
          {item.fun_fact ? (
            <HintRow
              label={t('collections.detail.creatorHints.fields.funFact')}
              value={item.fun_fact}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function HintRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mt-2">
      <Text className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-0.5">
        {label}
      </Text>
      <Text className="text-xs text-text leading-5">{value}</Text>
    </View>
  );
}

interface ForkPanelProps {
  fork: ReturnType<typeof useForkCollection>;
  onFork: () => void;
  onOpenMine: (id: string) => void;
}

function ForkPanel({ fork, onFork, onOpenMine }: ForkPanelProps) {
  const { t } = useTranslation();
  // forkId === false means the source IS the user's own collection — no
  // affordance to render (covered upstream by !isOwner, but kept defensive).
  if (fork.forkId === false) return null;

  if (typeof fork.forkId === 'string') {
    return (
      <TouchableOpacity
        testID="collection-open-fork-button"
        onPress={() => onOpenMine(fork.forkId as string)}
        accessibilityRole="button"
        accessibilityLabel={t('collections.fork.openMine')}
        className="mt-3 px-4 py-3 rounded-md bg-surface border border-stroke flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-text">
          {t('collections.fork.alreadyForked')}
        </Text>
        <Text className="text-sm text-text-dim">›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      testID="collection-fork-button"
      onPress={onFork}
      disabled={fork.pending}
      accessibilityRole="button"
      accessibilityLabel={t('collections.fork.action')}
      accessibilityState={{ disabled: fork.pending }}
      className={`mt-3 px-4 py-3 rounded-md bg-gold items-center justify-center ${fork.pending ? 'opacity-60' : ''}`}>
      <Text className="text-sm font-bold text-on-gold">
        {fork.pending ? t('collections.fork.actionPending') : t('collections.fork.action')}
      </Text>
    </TouchableOpacity>
  );
}

function ItemCell({
  item,
  find,
  size,
  onPress,
  disabled,
}: {
  item: CollectionItemWithFound;
  find: Find | undefined;
  size: number;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const photo = find?.photo_url ?? item.example_image_url;
  // True when the displayed image is a Wikipedia/Unsplash reference rather
  // than a real find — drives the "Example" badge so the user knows this
  // photo isn't theirs (or anyone's) yet.
  const isExample = !find && Boolean(item.example_image_url);

  return (
    <TouchableOpacity
      testID={`collection-item-cell-${item.id}`}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={
        isExample ? `${item.name} — ${t('collections.items.examplePhoto')}` : item.name
      }
      activeOpacity={disabled ? 1 : 0.75}
      style={{ width: size, height: size }}
      className={`rounded-md overflow-hidden bg-surface border border-stroke ${disabled ? 'opacity-40' : ''}`}>
      {photo ? (
        <Image source={{ uri: photo }} style={{ flex: 1 }} contentFit="cover" />
      ) : (
        <View className="flex-1 items-center justify-center bg-surface-hi">
          <Text className="text-3xl">📷</Text>
        </View>
      )}
      {isExample ? (
        <View className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-gold-glow border border-gold-lo">
          <Text className="text-[9px] font-bold uppercase tracking-wider text-text">
            {t('collections.items.examplePhoto')}
          </Text>
        </View>
      ) : null}
      <View className="absolute left-0 right-0 bottom-0 px-2 py-1 bg-overlay">
        <Text numberOfLines={1} className="text-xs text-text font-semibold">
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
