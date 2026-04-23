import { LanguageSwitcher } from '@components/LanguageSwitcher';
import { SafeAreaView } from '@components/SafeAreaView';
import { ThemeSwitcher } from '@components/ThemeSwitcher';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

export function ProfileScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-5 pt-4 pb-3">
          <Text className="text-2xl font-bold text-text">{t('profile.title')}</Text>
        </View>
        <View className="px-5 py-4 gap-8">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
