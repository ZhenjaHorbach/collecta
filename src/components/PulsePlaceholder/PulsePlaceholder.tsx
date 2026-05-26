import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Pulsing surface-hi tile that sits over an image slot until the cover loads.
// Positioned absolutely so the caller can drop it as a sibling of <Image/>
// inside an `overflow-hidden` parent and let it cover the whole frame.
export function PulsePlaceholder() {
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={style} className="absolute top-0 left-0 right-0 bottom-0 bg-surface-hi" />
  );
}
