import { ActivityIndicator, View } from 'react-native';

import { useColors } from '@hooks/useColors';

export interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  const colors = useColors();
  return (
    <View className={`flex-1 items-center justify-center py-20 ${className ?? ''}`}>
      <ActivityIndicator color={colors.gold} />
    </View>
  );
}
