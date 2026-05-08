import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export interface XpPopupProps {
  delta: number | null;
  onDismiss: () => void;
}

const VISIBLE_MS = 1200;

export function XpPopup({ delta, onDismiss }: XpPopupProps) {
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (delta === null) return;
    translateY.value = 20;
    opacity.value = 0;
    translateY.value = withSequence(
      withTiming(-32, { duration: 320, easing: Easing.out(Easing.cubic) }),
      withDelay(
        VISIBLE_MS,
        withTiming(-72, { duration: 280, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) runOnJS(onDismiss)();
        })
      )
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 220 }),
      withDelay(VISIBLE_MS, withTiming(0, { duration: 280 }))
    );
  }, [delta, opacity, onDismiss, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (delta === null) return null;

  return (
    <Animated.View
      testID="xp-popup"
      pointerEvents="none"
      className="absolute bottom-32 left-0 right-0 z-50 items-center"
      style={style}>
      <View className="rounded-full bg-gold px-4 py-2">
        <Text className="text-on-gold font-bold text-base">+{delta} XP</Text>
      </View>
    </Animated.View>
  );
}
