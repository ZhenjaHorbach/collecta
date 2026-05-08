import Constants from 'expo-constants';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { GoBackButton } from '@components/GoBackButton';
import { LanguageSwitcher } from '@components/LanguageSwitcher';
import { SafeAreaView } from '@components/SafeAreaView';
import { ThemeSwitcher } from '@components/ThemeSwitcher';
import { useAuth } from '@hooks/useAuth';
import { useColors } from '@hooks/useColors';
import { useSetting, type SettingName } from '@hooks/useSetting';
import { useUserProfile } from '@hooks/useUserProfile';
import { signOut } from '@services/auth.service';

export function SettingsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.id);

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

  const version = Constants.expoConfig?.version ?? '—';

  return (
    <SafeAreaView testID="settings-screen">
      <GoBackButton icon="close">
        <Text className="text-2xl font-bold text-text">{t('profile.settings')}</Text>
      </GoBackButton>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 60 }}>
        <View className="px-5 pt-2 gap-6">
          {profile ? (
            <View className="flex-row items-center gap-3 rounded-md border border-stroke bg-surface p-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-surface-hi">
                <Text className="text-base font-bold text-text-dim">
                  {profile.displayName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-text" numberOfLines={1}>
                  {profile.displayName}
                </Text>
                <Text className="text-xs text-text-dim" numberOfLines={1}>
                  @{profile.username} · {t('profile.levelBadge', { level: profile.level })}
                </Text>
              </View>
            </View>
          ) : null}

          <SettingsSection title={t('settings.sections.appearance')}>
            <ThemeSwitcher />
            <View className="h-px bg-stroke my-2" />
            <LanguageSwitcher />
            <View className="h-px bg-stroke my-2" />
            <SettingToggle
              name="highResUploads"
              label={t('settings.highRes.label')}
              subtitle={t('settings.highRes.subtitle')}
            />
          </SettingsSection>

          <SettingsSection title={t('settings.sections.capture')}>
            <SettingToggle
              name="autoTagLocation"
              label={t('settings.autoLocation.label')}
              subtitle={t('settings.autoLocation.subtitle')}
            />
            <View className="h-px bg-stroke my-2" />
            <SettingToggle
              name="aiVerification"
              label={t('settings.aiVerification.label')}
              subtitle={t('settings.aiVerification.subtitle')}
            />
          </SettingsSection>

          <SettingsSection title={t('settings.sections.notifications')}>
            <SettingToggle
              name="pushNotifications"
              label={t('settings.pushNotifications.label')}
              subtitle={t('settings.pushNotifications.subtitle')}
            />
          </SettingsSection>

          <SettingsSection title={t('settings.sections.about')}>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-sm font-semibold text-text">{t('settings.about.version')}</Text>
              <Text className="text-sm text-text-dim">{version}</Text>
            </View>
          </SettingsSection>

          <Pressable
            testID="settings-signout-button"
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

interface SectionProps {
  title: string;
  children: ReactNode;
}

function SettingsSection({ title, children }: SectionProps) {
  return (
    <View>
      <Text className="text-[11px] font-bold uppercase tracking-wider text-text-dim mb-2 px-1">
        {title}
      </Text>
      <View className="rounded-md border border-stroke bg-surface px-4 py-3">{children}</View>
    </View>
  );
}

interface ToggleProps {
  name: SettingName;
  label: string;
  subtitle?: string;
}

function SettingToggle({ name, label, subtitle }: ToggleProps) {
  const colors = useColors();
  const [value, setValue] = useSetting(name);
  return (
    <View className="flex-row items-center gap-3 py-2">
      <View className="flex-1">
        <Text className="text-sm font-semibold text-text">{label}</Text>
        {subtitle ? <Text className="text-xs text-text-dim mt-0.5">{subtitle}</Text> : null}
      </View>
      <Switch
        testID={`settings-toggle-${name}`}
        value={value}
        onValueChange={setValue}
        trackColor={{ true: colors.gold, false: colors.strokeHi }}
        thumbColor={colors.bg}
        ios_backgroundColor={colors.strokeHi}
      />
    </View>
  );
}
