import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';

interface SafeAreaViewProps {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function SafeAreaView({ children, className, style }: SafeAreaViewProps) {
  return (
    <RNSafeAreaView className={`flex-1 bg-bg ${className ?? ''}`} style={style}>
      {children}
    </RNSafeAreaView>
  );
}
