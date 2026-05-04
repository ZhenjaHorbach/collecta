import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Marker, type Region } from 'react-native-maps';
import ClusterMapView from 'react-native-map-clustering';
import { router, useLocalSearchParams } from 'expo-router';

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
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();

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

  // Honour ?lat=&lng= as a focus override (e.g. from a find detail's mini-map
  // "Open map" button). Re-keying the body forces ClusterMapView to remount
  // with a fresh initialRegion — the wrapper's animateToRegion is unreliable.
  const focusLat = params.lat ? Number(params.lat) : null;
  const focusLng = params.lng ? Number(params.lng) : null;
  const focused =
    focusLat != null && focusLng != null && Number.isFinite(focusLat) && Number.isFinite(focusLng)
      ? { lat: focusLat, lng: focusLng }
      : null;

  const initialLocation = focused ?? location;
  const focusKey = focused ? `${focused.lat},${focused.lng}` : 'self';

  return (
    <MapBody
      key={focusKey}
      initialLocation={initialLocation}
      tightZoom={focused != null}
      t={t}
      colors={colors}
    />
  );
}

interface MapBodyProps {
  initialLocation: { lat: number; lng: number } | null;
  tightZoom: boolean;
  t: ReturnType<typeof useTranslation>['t'];
  colors: ReturnType<typeof useColors>;
}

function MapBody({ initialLocation, tightZoom, t, colors }: MapBodyProps) {
  const baseRegion = tightZoom
    ? { ...DEFAULT_MAP_REGION, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : DEFAULT_MAP_REGION;
  const initialRegion: Region = initialLocation
    ? { ...baseRegion, latitude: initialLocation.lat, longitude: initialLocation.lng }
    : baseRegion;

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
          <FindMarkerPin
            key={f.id}
            lat={f.lat}
            lng={f.lng}
            photoUrl={f.photoUrl}
            emoji={f.collectionEmoji ?? CATEGORY_EMOJI[f.category]}
            category={f.category}
            onPress={() => router.push(`/find/${f.id}`)}
          />
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
            onPress={(f) => router.push(`/find/${f.id}`)}
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

// On Android (Google Maps) custom marker views are captured to a bitmap once
// when the marker mounts. With tracksViewChanges=false from the start the
// capture happens before expo-image has resolved the URL → blank pin. Track
// changes until onPhotoLoad fires, then disable tracking to keep the pan
// smooth. iOS doesn't have the issue but the same code path is harmless.
interface FindMarkerPinProps {
  lat: number;
  lng: number;
  photoUrl: string;
  emoji: string | null;
  category: CollectionCategory;
  onPress: () => void;
}

function FindMarkerPin({ lat, lng, photoUrl, emoji, category, onPress }: FindMarkerPinProps) {
  const [tracks, setTracks] = useState(Platform.OS === 'android');
  // Android renders a centered disk (no triangle pointer), so the anchor sits
  // at the bitmap centre. iOS keeps the photo-card layout with the apex at
  // the bottom edge of the captured view.
  const anchor =
    Platform.OS === 'android' ? ({ x: 0.5, y: 0.5 } as const) : ({ x: 0.5, y: 1 } as const);
  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      anchor={anchor}
      tracksViewChanges={tracks}
      onPress={onPress}>
      <FindMarker
        photoUrl={photoUrl}
        emoji={emoji}
        category={category}
        onPhotoLoad={() => setTracks(false)}
      />
    </Marker>
  );
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
