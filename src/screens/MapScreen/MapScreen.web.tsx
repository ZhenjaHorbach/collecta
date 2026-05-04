import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { NearbyFindCard } from '@components/NearbyFindCard';
import { SafeAreaView } from '@components/SafeAreaView';
import { Spinner } from '@components/Spinner';
import {
  CATEGORY_EMOJI,
  COLLECTION_CATEGORIES,
  type CollectionCategory,
} from '@constants/categories';
import { DEFAULT_MAP_REGION } from '@constants/map';
import { useColors } from '@hooks/useColors';
import { useMapFinds } from '@hooks/useMapFinds';
import { useUserLocation } from '@hooks/useUserLocation';
import type { MapFind, ViewportBounds } from '@services/finds.service';
import { haversineKm } from '@utils/geo.utils';

// Web override — see MapScreen.tsx for the native (react-native-maps)
// implementation. Native and web share the same hooks (`useMapFinds`,
// `useUserLocation`) and data flow; only the rendering layer differs.
//
// Clustering is intentionally skipped for v1 web — `@googlemaps/markerclusterer`
// can be wired later as a follow-up if marker density becomes a problem.

// Metro inlines `EXPO_PUBLIC_*` vars at bundle time on web; the EXPO_PUBLIC_
// prefix is the official Expo signal that this var is safe to ship to the
// client. Defence in depth: HTTP referrer restrictions on the key in Google
// Cloud Console scope it to our origins.
const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Same conversion as the native screen — viewport delta drives the bounds
// query that hydrates the markers.
function regionToBounds(
  center: { lat: number; lng: number },
  zoom: number,
  width = 1024,
  height = 768
): ViewportBounds {
  // Rough degrees-per-pixel from zoom; precise enough for hydration cap.
  const scale = Math.pow(2, zoom);
  const lngDelta = (width / 256 / scale) * 360;
  const latDelta = (height / 256 / scale) * 180;
  return {
    minLat: center.lat - latDelta / 2,
    maxLat: center.lat + latDelta / 2,
    minLng: center.lng - lngDelta / 2,
    maxLng: center.lng + lngDelta / 2,
  };
}

export function MapScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { location, status } = useUserLocation();
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();

  if (status === 'loading') {
    return (
      <SafeAreaView>
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      </SafeAreaView>
    );
  }

  if (!apiKey) {
    return (
      <SafeAreaView>
        <View className="flex-1 items-center justify-center px-6 gap-2">
          <Text className="text-base font-bold text-text">{t('map.webMissingKeyTitle')}</Text>
          <Text className="text-sm text-text-dim text-center">{t('map.webMissingKeyBody')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const focusLat = params.lat ? Number(params.lat) : null;
  const focusLng = params.lng ? Number(params.lng) : null;
  const focused =
    focusLat != null && focusLng != null && Number.isFinite(focusLat) && Number.isFinite(focusLng)
      ? { lat: focusLat, lng: focusLng }
      : null;

  const initialCenter = focused ??
    location ?? {
      lat: DEFAULT_MAP_REGION.latitude,
      lng: DEFAULT_MAP_REGION.longitude,
    };
  const initialZoom = focused ? 16 : 13;

  return (
    <MapBody
      initialCenter={initialCenter}
      initialZoom={initialZoom}
      viewerLocation={location}
      t={t}
      colors={colors}
    />
  );
}

interface MapBodyProps {
  initialCenter: { lat: number; lng: number };
  initialZoom: number;
  viewerLocation: { lat: number; lng: number } | null;
  t: ReturnType<typeof useTranslation>['t'];
  colors: ReturnType<typeof useColors>;
}

function MapBody({ initialCenter, initialZoom, viewerLocation, t, colors }: MapBodyProps) {
  const [center, setCenter] = useState(initialCenter);
  const [zoom, setZoom] = useState(initialZoom);
  const [activeCategory, setActiveCategory] = useState<CollectionCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const bounds = useMemo<ViewportBounds>(() => regionToBounds(center, zoom), [center, zoom]);
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
    if (!viewerLocation || visibleFinds.length === 0) return null;
    let best: { find: MapFind; distanceKm: number } | null = null;
    for (const f of visibleFinds) {
      const km = haversineKm(viewerLocation, { lat: f.lat, lng: f.lng });
      if (!best || km < best.distanceKm) best = { find: f, distanceKm: km };
    }
    return best;
  }, [viewerLocation, visibleFinds]);

  return (
    <View className="flex-1 bg-bg">
      <APIProvider apiKey={apiKey!}>
        <View className="absolute top-0 left-0 right-0 bottom-0">
          <Map
            defaultCenter={initialCenter}
            defaultZoom={initialZoom}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapId="collecta-web"
            onCameraChanged={(e) => {
              setCenter({ lat: e.detail.center.lat, lng: e.detail.center.lng });
              setZoom(e.detail.zoom);
            }}>
            {visibleFinds.map((f) => (
              <Marker
                key={f.id}
                position={{ lat: f.lat, lng: f.lng }}
                title={f.itemName}
                onClick={() => router.push(`/find/${f.id}`)}
              />
            ))}
          </Map>
        </View>
      </APIProvider>

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
