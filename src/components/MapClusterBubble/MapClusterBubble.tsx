import { useColors } from '@hooks/useColors';
import { Text, View } from 'react-native';

export interface MapClusterBubbleProps {
  count: number;
}

export function MapClusterBubble({ count }: MapClusterBubbleProps) {
  const colors = useColors();
  return (
    <View
      className="items-center justify-center rounded-xl bg-surface-hi"
      style={{
        minWidth: 44,
        height: 44,
        paddingHorizontal: 12,
        borderWidth: 2,
        borderColor: colors.gold,
      }}>
      <Text className="text-text font-bold" style={{ fontSize: 14 }}>
        {count}
      </Text>
    </View>
  );
}
