import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

export interface AchievementToastData {
  code: string;
  title: string;
  icon: string;
  xpReward: number;
}

export interface AchievementToastProps {
  achievement: AchievementToastData | null;
  onDismiss: () => void;
}

const VISIBLE_MS = 3500;

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  const { t } = useTranslation();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!achievement) return;
    translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 220 });
    translateY.value = withDelay(
      VISIBLE_MS,
      withTiming(-120, { duration: 240, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(onDismiss)();
      })
    );
    opacity.value = withDelay(VISIBLE_MS, withTiming(0, { duration: 220 }));
  }, [achievement, opacity, onDismiss, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!achievement) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      className="absolute left-0 right-0 top-12 z-50 items-center px-4"
      style={style}>
      <Pressable
        onPress={onDismiss}
        className="flex-row items-center gap-3 rounded-lg border border-stroke bg-surface-hi px-4 py-3">
        <View className="h-10 w-10 items-center justify-center rounded-md bg-gold">
          <Text className="text-xl">{achievement.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wider text-gold">
            {t('profile.toast.unlocked')}
          </Text>
          <Text className="text-sm font-bold text-text" numberOfLines={1}>
            {achievement.title}
          </Text>
        </View>
        <Text className="text-sm font-bold text-gold">+{achievement.xpReward}</Text>
      </Pressable>
    </Animated.View>
  );
}
