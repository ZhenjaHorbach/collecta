import { Text, View } from 'react-native';

export interface MapClusterBubbleProps {
  count: number;
}

export function MapClusterBubble({ count }: MapClusterBubbleProps) {
  return (
    <View className="items-center justify-center rounded-xl bg-surface-hi border-2 border-gold min-w-[44px] h-11 px-3">
      <Text className="text-text font-bold text-sm">{count}</Text>
    </View>
  );
}
