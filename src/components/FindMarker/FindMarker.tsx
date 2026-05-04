import { CATEGORY_COLOR } from '@constants/categories';
import { Image } from 'expo-image';
import type { CollectionCategory } from '@constants/categories';
import { Text, View } from 'react-native';

export interface FindMarkerProps {
  photoUrl: string;
  emoji: string | null;
  category: CollectionCategory;
  onPhotoLoad?: () => void;
}

// iOS path — kept as the original NativeWind layout. Apple Maps marker
// capture handles overflowing children and class-derived styles fine.
//
// Visual reference: .claude/design/collecta/project/screen-profile.jsx (MapScreen pin)
export function FindMarker({ photoUrl, emoji, category, onPhotoLoad }: FindMarkerProps) {
  const accent = CATEGORY_COLOR[category];

  return (
    <View className="items-center">
      <View className="w-10 h-10">
        <View
          className="rounded-md overflow-hidden border-2 w-full h-full"
          style={{ borderColor: accent }}>
          <Image
            source={{ uri: photoUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            onLoad={onPhotoLoad}
            onError={onPhotoLoad}
          />
        </View>
        {emoji && (
          <View
            className="absolute bg-bg items-center justify-center w-5 h-5 rounded-[10px] border-[1.5px] right-[0px] bottom-[0px] z-10"
            style={{ borderColor: accent }}>
            <Text className="text-[10px]">{emoji}</Text>
          </View>
        )}
      </View>
      <View
        className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent -mt-px"
        style={{ borderTopColor: accent }}
      />
    </View>
  );
}
