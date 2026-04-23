import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

export function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-bg items-center justify-end pb-10 px-7">
      <View className="w-full gap-4 mb-8">
        <Text className="text-5xl font-bold text-text leading-tight">
          {t('auth.welcome.title')}
        </Text>
        <Text className="text-text-dim text-sm leading-relaxed">{t('auth.welcome.subtitle')}</Text>
      </View>
      <View className="w-full gap-3">
        <Pressable
          onPress={() => {
            router.push('/auth/sign-up' as Href);
          }}
          className="w-full py-4 rounded-full bg-gold items-center active:opacity-75">
          <Text className="text-on-gold font-bold text-base">
            {t('auth.welcome.createAccount')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/auth/sign-in' as Href)}
          className="w-full py-4 rounded-full border border-stroke-hi items-center active:opacity-75">
          <Text className="text-text font-semibold text-sm">{t('auth.welcome.haveAccount')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
