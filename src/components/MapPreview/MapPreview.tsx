import { useState, type ReactElement } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { FindMarker } from '@components/FindMarker';
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

export function MapPreview({
  lat,
  lng,
  photoUrl,
  emoji,
  category,
  label,
  onOpenMap,
  openMapLabel,
}: MapPreviewProps): ReactElement {
  // Same Android quirk as MapScreen: track until image loads, then freeze.
  const [tracks, setTracks] = useState(Platform.OS === 'android');
  return (
    <View className="rounded-md overflow-hidden border border-stroke" style={{ height: 140 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}>
        <Marker coordinate={{ latitude: lat, longitude: lng }} tracksViewChanges={tracks}>
          <FindMarker
            photoUrl={photoUrl}
            emoji={emoji}
            category={category}
            onPhotoLoad={() => setTracks(false)}
          />
        </Marker>
      </MapView>

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
