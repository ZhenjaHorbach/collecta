import { GoBackButton } from '@components/GoBackButton';
import { LanguageSwitcher } from '@components/LanguageSwitcher';
import { SafeAreaView } from '@components/SafeAreaView';
import { ThemeSwitcher } from '@components/ThemeSwitcher';
import { signOut } from '@services/auth.service';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

export function SettingsScreen() {
  const { t } = useTranslation();

  // AuthGuard listens to onAuthStateChange and redirects to /auth when the
  // session goes null — no manual navigation needed here.
  const handleSignOut = (): void => {
    Alert.alert(t('profile.signOut.confirmTitle'), t('profile.signOut.confirmBody'), [
      { text: t('profile.signOut.cancel'), style: 'cancel' },
      {
        text: t('profile.signOut.confirm'),
        style: 'destructive',
        onPress: () => {
          void signOut().catch((e) => {
            console.warn('[settings] signOut failed', e);
            Alert.alert(t('common.error'));
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView>
      <GoBackButton icon="close">
        <Text className="text-2xl font-bold text-text">{t('profile.settings')}</Text>
      </GoBackButton>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="gap-8 px-5 py-4">
          <ThemeSwitcher />
          <LanguageSwitcher />

          <Pressable
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel={t('profile.signOut.action')}
            className="items-center justify-center rounded-md border border-stroke bg-transparent px-4 py-3.5">
            <Text className="text-sm font-bold text-coral">{t('profile.signOut.action')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
