import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from '@components/ProgressBar';

import type { ValidationResult } from '@schemas';

export interface ValidationResultSheetProps {
  status: 'ok' | 'vision_failed' | 'invoke_failed';
  result: ValidationResult | null;
  onSave: () => void;
  onRetake: () => void;
}

export function ValidationResultSheet({
  status,
  result,
  onSave,
  onRetake,
}: ValidationResultSheetProps) {
  const { t } = useTranslation();

  const titleKey =
    status !== 'ok'
      ? 'validation.uncertainTitle'
      : result?.valid
        ? 'validation.validTitle'
        : 'validation.invalidTitle';

  const percent = result ? Math.round(result.confidence * 100) : 0;

  return (
    <View className="bg-surface rounded-xl p-6 gap-4">
      <Text className="text-text text-xl font-semibold">{t(titleKey)}</Text>

      {result && (
        <View className="gap-2">
          <Text className="text-text-dim text-sm">{t('validation.confidence', { percent })}</Text>
          <ProgressBar value={result.confidence} />
        </View>
      )}

      {result && (
        <View className="gap-1">
          <Text className="text-text-dim text-xs uppercase">{t('validation.detectedLabel')}</Text>
          <Text className="text-text text-base">{result.detected}</Text>
        </View>
      )}

      {result && (
        <View className="gap-1">
          <Text className="text-text-dim text-xs uppercase">{t('validation.suggestionLabel')}</Text>
          <Text className="text-text text-base">{result.suggestion}</Text>
        </View>
      )}

      <Text className="text-text-muted text-xs">{t('validation.advisoryNote')}</Text>

      <View className="flex-row gap-3">
        <Pressable onPress={onRetake} className="flex-1 bg-surface-hi rounded-md p-4 items-center">
          <Text className="text-text">{t('camera.retake')}</Text>
        </Pressable>
        <Pressable onPress={onSave} className="flex-1 bg-gold rounded-md p-4 items-center">
          <Text className="text-on-gold font-semibold">
            {result?.valid === false ? t('validation.saveAnyway') : t('camera.save')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
