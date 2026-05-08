import { SafeAreaView } from '@components/SafeAreaView';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

interface Slide {
  key: 'slide1' | 'slide2' | 'slide3';
  emoji: string;
}

const SLIDES: readonly Slide[] = [
  { key: 'slide1', emoji: '🗺️' },
  { key: 'slide2', emoji: '📸' },
  { key: 'slide3', emoji: '🏆' },
];

export function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const finish = useCallback(() => router.replace('/(tabs)'), [router]);

  const handleNext = useCallback(() => {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }, [index, finish]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      if (next !== index) setIndex(next);
    },
    [index, width]
  );

  const isLast = index === SLIDES.length - 1;

  return (
    <SafeAreaView>
      <View testID="onboarding-screen" className="flex-1">
        <View className="flex-row justify-end px-6 pt-2">
          <TouchableOpacity
            testID="onboarding-skip-button"
            onPress={finish}
            accessibilityRole="button"
            accessibilityLabel={t('auth.onboarding.skip')}
            className="px-3 py-2">
            <Text className="text-text-dim text-sm font-semibold">{t('auth.onboarding.skip')}</Text>
          </TouchableOpacity>
        </View>

        <FlatList<Slide>
          ref={listRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={{ width }} className="flex-1 items-center justify-center px-8">
              <Text className="text-7xl mb-8">{item.emoji}</Text>
              <Text className="text-3xl font-bold text-text text-center mb-4">
                {t(`auth.onboarding.${item.key}.title`)}
              </Text>
              <Text className="text-base text-text-dim text-center leading-relaxed">
                {t(`auth.onboarding.${item.key}.subtitle`)}
              </Text>
            </View>
          )}
        />

        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-center gap-2 mb-6">
            {SLIDES.map((s, i) => (
              <View
                key={s.key}
                className={`h-2 rounded-full ${i === index ? 'w-6 bg-gold' : 'w-2 bg-surface-hi'}`}
              />
            ))}
          </View>
          <TouchableOpacity
            testID="onboarding-next-button"
            onPress={handleNext}
            accessibilityRole="button"
            className="w-full py-4 rounded-full bg-gold items-center">
            <Text className="text-on-gold font-bold text-base">
              {t(isLast ? 'auth.onboarding.startCollecting' : 'auth.onboarding.next')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
