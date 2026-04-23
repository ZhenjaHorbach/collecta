import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

type Icon = 'back' | 'close';

export type GoBackButtonProps = {
  icon?: Icon;
  onPress?: () => void;
  children?: ReactNode;
};

const glyphByIcon: Record<Icon, string> = {
  back: '‹',
  close: '✕',
};

export function GoBackButton({ icon = 'back', onPress, children }: GoBackButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const handlePress = onPress ?? (() => router.back());

  return (
    <View className="px-4 pt-2 pb-3 flex-row items-center gap-3">
      <TouchableOpacity
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={icon === 'back' ? t('common.goBack') : t('common.close')}
        className="w-10 h-10 rounded-xl bg-surface items-center justify-center border border-stroke">
        <Text className="text-text text-base">{glyphByIcon[icon]}</Text>
      </TouchableOpacity>
      {children}
    </View>
  );
}
