import { GoBackButton } from '@components/GoBackButton';
import { SafeAreaView } from '@components/SafeAreaView';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

export function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView>
      <GoBackButton />
      <View className="flex-1 px-6 pt-2">
        <Text className="text-3xl font-bold text-text mb-2">{t('auth.onboarding.title')}</Text>
        <Text className="text-text-dim text-sm mb-8">{t('auth.onboarding.subtitle')}</Text>
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-muted text-base">{t('auth.onboarding.comingSoon')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          className="w-full py-4 rounded-full bg-gold items-center mb-4">
          <Text className="text-on-gold font-bold text-base">
            {t('auth.onboarding.startCollecting')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
