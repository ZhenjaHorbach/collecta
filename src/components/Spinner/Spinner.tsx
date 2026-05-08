import { ActivityIndicator, View } from 'react-native';

import { useColors } from '@hooks/useColors';

export interface SpinnerProps {
  className?: string;
  testID?: string;
}

export function Spinner({ className, testID }: SpinnerProps) {
  const colors = useColors();
  return (
    <View testID={testID} className={`flex-1 items-center justify-center py-20 ${className ?? ''}`}>
      <ActivityIndicator color={colors.gold} />
    </View>
  );
}
