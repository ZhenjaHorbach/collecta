import { CATEGORY_COLOR } from '@constants/categories';
import { Image } from 'expo-image';
import type { CollectionCategory } from '@constants/categories';
import { Text, View } from 'react-native';

export interface FindMarkerProps {
  photoUrl: string;
  emoji: string | null;
  category: CollectionCategory;
}

// Visual reference: .claude/design/collecta/project/screen-profile.jsx (MapScreen pin)
export function FindMarker({ photoUrl, emoji, category }: FindMarkerProps) {
  const accent = CATEGORY_COLOR[category];

  return (
    <View className="items-center">
      <View className="w-12 h-12">
        <View
          className="rounded-md overflow-hidden border-2 w-full h-full"
          style={{ borderColor: accent }}>
          <Image
            source={{ uri: photoUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </View>
        {emoji && (
          <View
            className="absolute bg-bg items-center justify-center w-5 h-5 rounded-[10px] border-[1.5px] right-[-6px] bottom-[-6px] z-10"
            style={{ borderColor: accent }}>
            <Text className="text-[10px]">{emoji}</Text>
          </View>
        )}
      </View>
      <View
        className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent -mt-px"
        style={{ borderTopColor: accent }}
      />
    </View>
  );
}
