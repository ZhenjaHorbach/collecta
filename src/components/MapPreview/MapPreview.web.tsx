import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { CollectionCategory } from '@constants/categories';

export interface MapPreviewProps {
  lat: number;
  lng: number;
  photoUrl: string;
  emoji: string | null;
  category: CollectionCategory;
  label: string;
  onOpenMap: () => void;
  openMapLabel: string;
}

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Web override — see MapPreview.tsx for the native (react-native-maps) version.
// The card is non-interactive (no zoom/pan) so the FindDetailScreen feels the
// same as on mobile. If the API key isn't surfaced, we fall back to a plain
// label-only card; the build doesn't rely on the key being present.
export function MapPreview({
  lat,
  lng,
  label,
  onOpenMap,
  openMapLabel,
}: MapPreviewProps): ReactElement {
  return (
    <View className="h-[140px] rounded-md overflow-hidden border border-stroke">
      {apiKey ? (
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={{ lat, lng }}
            defaultZoom={15}
            gestureHandling="none"
            disableDefaultUI
            mapId="collecta-web-preview">
            <Marker position={{ lat, lng }} />
          </Map>
        </APIProvider>
      ) : (
        <View className="flex-1 bg-surface items-center justify-center">
          <Text className="text-sm text-text-dim">{label}</Text>
        </View>
      )}

      <View
        pointerEvents="box-none"
        className="absolute bottom-2 left-2 right-2 flex-row items-center justify-between">
        <View className="rounded-full bg-overlay border border-stroke-hi px-3 py-1.5">
          <Text className="text-xs font-semibold text-text" numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Pressable
          onPress={onOpenMap}
          accessibilityRole="button"
          accessibilityLabel={openMapLabel}
          className="rounded-full bg-overlay border border-stroke-hi px-3 py-1.5">
          <Text className="text-xs font-bold text-text">{openMapLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
