import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';

import { MAX_CONTENT_CLASS } from '@constants/layout';

interface SafeAreaViewProps {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  // `true` → opt out of the global content cap. Use for fullscreen surfaces
  // (map, immersive camera, etc.) that own the entire viewport. Default
  // (false) clamps to MAX_CONTENT_WIDTH and centers — this is what you want
  // for every list / detail / form screen on tablet + desktop web.
  wide?: boolean;
}

export function SafeAreaView({ children, className, style, testID, wide }: SafeAreaViewProps) {
  // Outer always fills the viewport with bg-bg so the area outside the
  // centered content doesn't fall through to the navigator's transparent
  // background (which renders pure black on web). Inner clamps + centers.
  return (
    <RNSafeAreaView testID={testID} className={`flex-1 bg-bg ${className ?? ''}`} style={style}>
      {wide ? children : <View className={`flex-1 ${MAX_CONTENT_CLASS}`}>{children}</View>}
    </RNSafeAreaView>
  );
}
