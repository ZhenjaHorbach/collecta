import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Marker, type Region } from 'react-native-maps';
import ClusterMapView from 'react-native-map-clustering';
import { router } from 'expo-router';

import { FindMarker } from '@components/FindMarker';
import { MapClusterBubble } from '@components/MapClusterBubble';
import { NearbyFindCard } from '@components/NearbyFindCard';
import { Spinner } from '@components/Spinner';
import {
  CATEGORY_EMOJI,
  COLLECTION_CATEGORIES,
  type CollectionCategory,
} from '@constants/categories';
import { DEFAULT_MAP_REGION, MAP_CLUSTER_RADIUS } from '@constants/map';
import { useColors } from '@hooks/useColors';
import { useMapFinds } from '@hooks/useMapFinds';
import { useUserLocation } from '@hooks/useUserLocation';
import type { MapFind, ViewportBounds } from '@services/finds.service';
import { haversineKm } from '@utils/geo.utils';

function regionToBounds(region: Region): ViewportBounds {
  return {
    minLat: region.latitude - region.latitudeDelta / 2,
    maxLat: region.latitude + region.latitudeDelta / 2,
    minLng: region.longitude - region.longitudeDelta / 2,
    maxLng: region.longitude + region.longitudeDelta / 2,
  };
}

export function MapScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { location, status } = useUserLocation();

  // Defer mounting MapView until permission/location resolves so initialRegion
  // is correct on first render. initialRegion is one-shot in react-native-maps;
  // mounting late is more reliable than animateToRegion through the cluster wrapper.
  if (status === 'loading') {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <Spinner />
      </View>
    );
  }

  return <MapBody initialLocation={location} t={t} colors={colors} />;
}

interface MapBodyProps {
  initialLocation: { lat: number; lng: number } | null;
  t: ReturnType<typeof useTranslation>['t'];
  colors: ReturnType<typeof useColors>;
}

function MapBody({ initialLocation, t, colors }: MapBodyProps) {
  const initialRegion: Region = initialLocation
    ? { ...DEFAULT_MAP_REGION, latitude: initialLocation.lat, longitude: initialLocation.lng }
    : DEFAULT_MAP_REGION;

  const [region, setRegion] = useState<Region>(initialRegion);
  const [activeCategory, setActiveCategory] = useState<CollectionCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const location = initialLocation;

  const bounds = useMemo<ViewportBounds>(() => regionToBounds(region), [region]);
  const { finds } = useMapFinds(bounds);

  const visibleFinds = useMemo(() => {
    const byCategory =
      activeCategory === 'all' ? finds : finds.filter((f) => f.category === activeCategory);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter(
      (f) => f.itemName.toLowerCase().includes(q) || f.collectionTitle.toLowerCase().includes(q)
    );
  }, [finds, activeCategory, searchQuery]);

  const nearest = useMemo<{ find: MapFind; distanceKm: number } | null>(() => {
    if (!location || visibleFinds.length === 0) return null;
    let best: { find: MapFind; distanceKm: number } | null = null;
    for (const f of visibleFinds) {
      const km = haversineKm(location, { lat: f.lat, lng: f.lng });
      if (!best || km < best.distanceKm) best = { find: f, distanceKm: km };
    }
    return best;
  }, [location, visibleFinds]);

  return (
    <View className="flex-1 bg-bg">
      <ClusterMapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onRegionChangeComplete={setRegion}
        showsUserLocation={!!location}
        showsMyLocationButton={false}
        clusterColor={colors.gold}
        clusterTextColor={colors.bg}
        radius={MAP_CLUSTER_RADIUS}
        renderCluster={(cluster: {
          id: string;
          geometry: { coordinates: [number, number] };
          properties: { point_count: number };
          onPress: () => void;
        }) => (
          <Marker
            key={`cluster-${cluster.id}`}
            coordinate={{
              latitude: cluster.geometry.coordinates[1],
              longitude: cluster.geometry.coordinates[0],
            }}
            onPress={cluster.onPress}>
            <MapClusterBubble count={cluster.properties.point_count} />
          </Marker>
        )}>
        {visibleFinds.map((f) => (
          <Marker
            key={f.id}
            coordinate={{ latitude: f.lat, longitude: f.lng }}
            tracksViewChanges={false}
            onPress={() => router.push(`/collection/${f.collectionId}`)}>
            <FindMarker
              photoUrl={f.photoUrl}
              emoji={f.collectionEmoji ?? CATEGORY_EMOJI[f.category]}
              category={f.category}
            />
          </Marker>
        ))}
      </ClusterMapView>

      <View pointerEvents="box-none" className="absolute top-14 left-0 right-0 px-4">
        <View className="flex-row items-center gap-3 rounded-md bg-overlay border border-stroke-hi p-3 shadow-lg">
          <MaterialIcons name="search" size={17} color={colors.textDim} />
          <TextInput
            className="flex-1 text-text text-sm"
            placeholder={t('map.searchPlaceholder')}
            placeholderTextColor={colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="py-3 gap-2">
          <CategoryChip
            label={t('map.filterAll')}
            active={activeCategory === 'all'}
            onPress={() => setActiveCategory('all')}
          />
          {COLLECTION_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              emoji={CATEGORY_EMOJI[cat]}
              label={t(`categories.${cat}`)}
              active={activeCategory === cat}
              onPress={() => setActiveCategory(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {nearest && (
        <View pointerEvents="box-none" className="absolute bottom-6 left-0 right-0 px-4">
          <Text className="text-text-dim text-xs font-bold uppercase mb-2 px-1">
            {t('map.nearYou')}
          </Text>
          <NearbyFindCard
            find={nearest.find}
            distanceKm={nearest.distanceKm}
            onPress={(f) => router.push(`/collection/${f.collectionId}`)}
          />
        </View>
      )}
    </View>
  );
}

interface ChipProps {
  emoji?: string;
  label: string;
  active: boolean;
  onPress: () => void;
}

function CategoryChip({ emoji, label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={
        active
          ? 'flex-row items-center gap-1.5 rounded-xl bg-text px-3 py-1.5 shadow-md'
          : 'flex-row items-center gap-1.5 rounded-xl bg-overlay border border-stroke-hi px-3 py-1.5 shadow-md'
      }>
      {emoji && <Text className="text-sm">{emoji}</Text>}
      <Text
        className={active ? 'text-bg text-xs font-semibold' : 'text-text text-xs font-semibold'}>
        {label}
      </Text>
    </Pressable>
  );
}
