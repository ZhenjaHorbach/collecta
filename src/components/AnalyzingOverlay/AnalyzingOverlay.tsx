import { Image as ExpoImage } from 'expo-image';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '@hooks/useColors';

import type { CaptureStage } from '@hooks/useCapture';

export interface AnalyzingOverlayProps {
  photoUri: string;
  stage: CaptureStage;
}

// Analyzing screen modeled on the design (`screen-camera.jsx → Analyzing`):
// blurred photo backdrop, gold scan line sweeping vertically, pulsing
// sparkle puck, and a stage-aware label. Replaces the bare Spinner so the
// user sees that something visual is happening, not a generic wait state.
export function AnalyzingOverlay({ photoUri, stage }: AnalyzingOverlayProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useColors();
  const screenHeight = Dimensions.get('window').height;

  const scanY = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    scanY.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    pulse.value = withRepeat(
      withTiming(1.15, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [scanY, pulse]);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value * (screenHeight * 0.6) + screenHeight * 0.2 }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const stageLabelKey: Record<CaptureStage, string | null> = {
    idle: null,
    compressing: 'camera.compressing',
    uploading: 'camera.uploading',
    validating: 'camera.analyzing.title',
    done: null,
    error: null,
  };
  const titleKey = stageLabelKey[stage] ?? 'camera.analyzing.title';

  return (
    <View className="flex-1 bg-app-shell">
      <ExpoImage
        source={{ uri: photoUri }}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
        contentFit="cover"
        blurRadius={12}
        recyclingKey={photoUri}
      />
      <View
        className="absolute left-0 right-0 top-0 bottom-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      />

      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: colors.gold,
            shadowColor: colors.gold,
            shadowOpacity: 0.9,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 0 },
          },
          scanStyle,
        ]}
      />

      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Animated.View
          style={[
            {
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.gold,
              alignItems: 'center',
              justifyContent: 'center',
            },
            pulseStyle,
          ]}>
          <Text style={{ color: colors.onGold, fontSize: 28 }}>✦</Text>
        </Animated.View>
        <Text className="text-text text-lg font-semibold text-center">{t(titleKey)}</Text>
        <Text className="text-text-dim text-sm text-center">{t('camera.analyzing.subtitle')}</Text>
      </View>
    </View>
  );
}
