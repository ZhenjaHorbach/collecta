import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDebounce } from 'use-debounce';

import { EmptyState } from '@components/EmptyState';
import { PulsePlaceholder } from '@components/PulsePlaceholder';
import { Spinner } from '@components/Spinner';
import { Tabs } from '@components/Tabs';
import {
  CATEGORY_EMOJI,
  COLLECTION_CATEGORIES,
  type CollectionCategory,
} from '@constants/categories';
import { useCollectionsDeleteRealtime } from '@hooks/useCollectionsDeleteRealtime';
import { useColors } from '@hooks/useColors';
import { useDiscover } from '@hooks/useDiscover';
import { useGridCellWidth } from '@hooks/useGridCellWidth';
import type { DiscoverCollection, DiscoverSort } from '@services/discover.service';

const SEARCH_DEBOUNCE_MS = 300;

// Discover surface — search + category strip + sort tabs over the public
// collection catalog. Mounted as the second tab inside CollectionsScreen so
// it shares the screen's header and "+ New collection" affordance.
// Grid layout constants — kept here so DiscoverCard can pin its own width.
// Without an explicit width, a lone trailing card in an odd-count list
// stretches across the row because flex-1 has no sibling to share with.
const GRID_PADDING = 16;
const GRID_GAP = 12;
const GRID_COLUMNS = 2;

export function DiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const cellWidth = useGridCellWidth({
    padding: GRID_PADDING,
    gap: GRID_GAP,
    columns: GRID_COLUMNS,
  });
  const [category, setCategory] = useState<CollectionCategory | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<DiscoverSort>('popular');

  // Debounce the search input so we don't hit the RPC on every keystroke.
  // use-debounce handles unmount/strict-mode cleanup internally — no
  // ref + clearTimeout dance needed.
  const [debouncedQuery] = useDebounce(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  const { data, loading, error, refetch } = useDiscover({
    category,
    query: debouncedQuery,
    sort,
  });

  // Drop a deleted collection from the catalog without forcing the user
  // to scroll-to-refresh. RPC ranking stays authoritative — we just
  // re-run the same query.
  useCollectionsDeleteRealtime(() => {
    void refetch();
  });

  const sortOptions = useMemo(
    () =>
      [
        { key: 'popular' as const, label: t('discover.sort.popular') },
        { key: 'new' as const, label: t('discover.sort.new') },
      ] as const,
    [t]
  );

  const featured = data.find((c) => c.is_featured) ?? null;
  const grid = featured ? data.filter((c) => c.id !== featured.id) : data;

  const renderHeader = (
    <View>
      <View className="px-4 pt-1 pb-2">
        <SearchBar value={searchInput} onChange={setSearchInput} />
      </View>
      <CategoryStrip value={category} onChange={setCategory} />
      <View className="px-4 pt-3 pb-2">
        <Tabs<DiscoverSort>
          options={sortOptions}
          value={sort}
          onChange={setSort}
          testIDPrefix="discover-sort"
        />
      </View>
      {featured ? (
        <View className="px-4 pt-2 pb-3">
          <FeaturedCard
            collection={featured}
            onPress={() => router.push(`/collection/${featured.id}`)}
          />
        </View>
      ) : null}
    </View>
  );

  if (loading && data.length === 0) {
    return (
      <View>
        {renderHeader}
        <Spinner />
      </View>
    );
  }

  if (error) {
    return (
      <View>
        {renderHeader}
        <View className="px-6 py-10 items-center">
          <Text className="text-coral text-base text-center">{t('discover.loadError')}</Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      testID="discover-screen"
      data={grid}
      keyExtractor={(item) => item.id}
      numColumns={GRID_COLUMNS}
      // Horizontal padding lives on the row wrapper, NOT on
      // contentContainerStyle. ListHeaderComponent is rendered inside the
      // contentContainer, so paddingHorizontal there would push the
      // header right by GRID_PADDING — causing a visible 16 px shift the
      // moment the spinner shell is replaced by the loaded grid (the
      // shell uses a plain <View> with no padding). columnWrapperStyle
      // only wraps grid rows, leaving the header's own px-4 children
      // aligned identically across both states.
      columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: GRID_PADDING }}
      contentContainerStyle={{
        paddingBottom: 120,
        gap: GRID_GAP,
      }}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={
        <EmptyState testID="discover-empty" icon="🔎" title={t('discover.empty')} />
      }
      renderItem={({ item }) => (
        <DiscoverCard
          collection={item}
          width={cellWidth}
          onPress={() => router.push(`/collection/${item.id}`)}
        />
      )}
    />
  );
}

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

function SearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View className="flex-row items-center bg-surface-lo border border-stroke rounded-md px-3 h-11">
      <Text className="text-text-dim mr-2">⌕</Text>
      <TextInput
        testID="discover-search-input"
        value={value}
        onChangeText={onChange}
        placeholder={t('discover.search')}
        placeholderTextColor={colors.textMuted}
        className="flex-1 text-sm text-text"
      />
      {value.length > 0 ? (
        <TouchableOpacity
          testID="discover-search-clear-button"
          onPress={() => onChange('')}
          accessibilityRole="button"
          accessibilityLabel="clear">
          <Text className="text-text-dim text-base">×</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface CategoryStripProps {
  value: CollectionCategory | null;
  onChange: (v: CollectionCategory | null) => void;
}

function CategoryStrip({ value, onChange }: CategoryStripProps) {
  const { t } = useTranslation();
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={['__all__' as const, ...COLLECTION_CATEGORIES]}
      keyExtractor={(item) => item}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      renderItem={({ item }) => {
        const isAll = item === '__all__';
        const active = isAll ? value === null : value === item;
        const label = isAll ? t('discover.categoryAll') : t(`categories.${item}`);
        const emoji = isAll ? '✨' : CATEGORY_EMOJI[item];
        return (
          <TouchableOpacity
            testID={`discover-category-${isAll ? 'all' : item}`}
            onPress={() => onChange(isAll ? null : item)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`px-3 py-2 rounded-full flex-row items-center gap-1 border ${
              active ? 'bg-gold border-gold' : 'bg-surface border-stroke'
            }`}>
            <Text className="text-base">{emoji}</Text>
            <Text className={`text-xs font-semibold ${active ? 'text-on-gold' : 'text-text-dim'}`}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

interface CardProps {
  collection: DiscoverCollection;
  onPress: () => void;
}

function FeaturedCard({ collection, onPress }: CardProps) {
  const { t } = useTranslation();
  const emoji =
    collection.icon ?? (collection.category ? CATEGORY_EMOJI[collection.category] : '📦');
  return (
    <TouchableOpacity
      testID={`discover-featured-${collection.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={collection.title}
      className="rounded-lg bg-gold-glow border border-gold-lo p-4">
      <View className="self-start px-2 py-1 rounded-full bg-gold mb-2">
        <Text className="text-[10px] uppercase tracking-wider font-bold text-on-gold">
          {t('discover.seasonal')}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Text className="text-4xl">{emoji}</Text>
        <View className="flex-1">
          <Text numberOfLines={2} className="text-lg font-bold text-text">
            {collection.title}
          </Text>
          {collection.description ? (
            <Text numberOfLines={2} className="text-xs text-text-dim mt-1">
              {collection.description}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function DiscoverCard({ collection, width, onPress }: CardProps & { width: number }) {
  const { t } = useTranslation();
  const emoji =
    collection.icon ?? (collection.category ? CATEGORY_EMOJI[collection.category] : '📦');
  // Pulsing placeholder over the cover slot until the image finishes loading
  // — same pattern as CollectionCard so the user doesn't see the empty
  // surface flash before the photo arrives.
  const [coverLoaded, setCoverLoaded] = useState(false);
  // width comes from useWindowDimensions in the parent, so it has to live in
  // an inline style — that's the explicit "dynamic runtime values" exception.
  // We pin width here instead of using flex-1 so a lone trailing card (odd
  // total count) doesn't stretch across the whole row.
  return (
    <TouchableOpacity
      testID={`discover-card-${collection.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={collection.title}
      style={{ width }}
      className="rounded-md bg-surface-lo border border-stroke p-3">
      {collection.cover_image_url ? (
        <View className="w-full h-24 rounded-sm bg-surface-hi mb-2 overflow-hidden">
          <Image
            source={{ uri: collection.cover_image_url }}
            style={{ flex: 1 }}
            contentFit="cover"
            transition={200}
            onLoad={() => setCoverLoaded(true)}
          />
          {!coverLoaded ? <PulsePlaceholder /> : null}
        </View>
      ) : (
        <View className="w-full h-24 rounded-sm bg-surface-hi mb-2 items-center justify-center">
          <Text className="text-4xl">{emoji}</Text>
        </View>
      )}
      <Text numberOfLines={2} className="text-sm font-semibold text-text">
        {collection.title}
      </Text>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-[10px] text-text-muted">
          {t('discover.itemsCount', { count: collection.items_count })}
        </Text>
        <Text className="text-[10px] text-text-dim">
          {t('discover.forksCount', { count: collection.forks_count })}
        </Text>
      </View>
      {collection.forked_by_me ? (
        <View className="mt-2 self-start px-2 py-1 rounded-full bg-mint-glow border border-mint">
          <Text className="text-[10px] font-semibold text-text">
            ✓ {t('discover.inMyCollections')}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
