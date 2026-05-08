import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface ProgressBarProps {
  value: number;
  className?: string;
}

const ANIM_MS = 600;

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const progress = useSharedValue(clamped);
  // Skip the initial mount: useSharedValue already seeds at `clamped`, so a
  // first withTiming would animate from clamped → clamped and waste 600ms.
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      progress.value = clamped;
      return;
    }
    progress.value = withTiming(clamped, {
      duration: ANIM_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, progress]);

  const style = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View className={`h-2 rounded-md bg-surface-hi overflow-hidden ${className ?? ''}`}>
      <Animated.View className="h-full bg-gold rounded-md" style={style} />
    </View>
  );
}
