import { useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { ConfirmDialogHost, confirm, notify } from '@components/ConfirmDialog';
import { GoBackButton } from '@components/GoBackButton';
import { LanguageSwitcher } from '@components/LanguageSwitcher';
import { SafeAreaView } from '@components/SafeAreaView';
import { ThemeSwitcher } from '@components/ThemeSwitcher';
import { useAuth } from '@hooks/useAuth';
import { useColors } from '@hooks/useColors';
import { useHasCamera } from '@hooks/useHasCamera';
import { useSetting, type SettingName } from '@hooks/useSetting';
import { useUserProfile } from '@hooks/useUserProfile';
import { signOut } from '@services/auth.service';
import { formatBuildIdentity, getBuildIdentity } from '@utils/version.utils';

export function SettingsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.id);
  // Hide the Camera row on devices without a camera (typically desktop web).
  // `null` while the probe is in flight — keep the row hidden to avoid a
  // flash of "Not asked → Granted" the user can't act on.
  const hasCamera = useHasCamera();

  const handleSignOut = async (): Promise<void> => {
    const ok = await confirm({
      title: t('profile.signOut.confirmTitle'),
      body: t('profile.signOut.confirmBody'),
      confirmLabel: t('profile.signOut.confirm'),
      cancelLabel: t('profile.signOut.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await signOut();
    } catch (e) {
      console.warn('[settings] signOut failed', e);
      void notify({ title: t('common.error'), buttonLabel: t('common.close') });
    }
  };

  const version = formatBuildIdentity(getBuildIdentity());

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

          <SettingsSection title={t('settings.sections.permissions')}>
            <LocationPermissionRow />
            {hasCamera ? (
              <>
                <View className="h-px bg-stroke my-2" />
                <CameraPermissionRow />
              </>
            ) : null}
            <View className="h-px bg-stroke my-2" />
            <NotificationsPermissionRow />
          </SettingsSection>

          <SettingsSection title={t('settings.sections.about')}>
            <View className="py-2 gap-1">
              <Text className="text-sm font-semibold text-text">{t('settings.about.version')}</Text>
              <Text className="text-xs text-text-dim" selectable>
                {version}
              </Text>
            </View>
          </SettingsSection>

          <Pressable
            testID="settings-signout-button"
            onPress={() => {
              void handleSignOut();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('profile.signOut.action')}
            className="items-center justify-center rounded-md border border-stroke bg-transparent px-4 py-3.5">
            <Text className="text-sm font-bold text-coral">{t('profile.signOut.action')}</Text>
          </Pressable>
        </View>
      </ScrollView>
      {/* Mount the dialog host inside this screen's tree so its <Modal>
          renders above the iOS native modal that presents Settings. */}
      <ConfirmDialogHost />
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

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

interface PermissionRowProps {
  label: string;
  subtitle: string;
  status: PermissionStatus;
  onPress: () => void;
  testID: string;
}

// Status row for an OS permission. Tap behavior:
//   undetermined → request the permission (handled by caller).
//   denied       → caller routes to Linking.openSettings().
//   granted      → caller routes to Linking.openSettings() (so the user
//                  can revoke from system settings — we can't revoke here).
function PermissionRow({ label, subtitle, status, onPress, testID }: PermissionRowProps) {
  const { t } = useTranslation();
  const badgeClass =
    status === 'granted'
      ? 'bg-mint-glow border-mint'
      : status === 'denied'
        ? 'bg-coral border-coral'
        : 'bg-surface-hi border-stroke';
  const badgeTextClass =
    status === 'granted' ? 'text-mint' : status === 'denied' ? 'text-text' : 'text-text-dim';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center gap-3 py-2 active:opacity-75">
      <View className="flex-1">
        <Text className="text-sm font-semibold text-text">{label}</Text>
        <Text className="text-xs text-text-dim mt-0.5">{subtitle}</Text>
      </View>
      <View className={`px-2 py-1 rounded-sm border ${badgeClass}`}>
        <Text className={`text-[10px] font-bold uppercase tracking-wide ${badgeTextClass}`}>
          {t(`settings.permissions.status.${status}`)}
        </Text>
      </View>
    </Pressable>
  );
}

function normalizeStatus(status: string | undefined): PermissionStatus {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

// Re-run `refresh` every time the app foregrounds. Permission hooks
// (useCameraPermissions / useForegroundPermissions / Notification.permission)
// don't auto-resync after the user toggles a permission in system settings
// and returns to the app, so we force a re-read on AppState 'active'.
function useAppActiveRefresh(refresh: () => void | Promise<void>): void {
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshRef.current();
    });
    return () => sub.remove();
  }, []);
}

// Tap behavior shared by every permission row:
//   granted        → native: open system settings (so the user can revoke).
//                    web: no-op (the browser's site-permissions UI is the
//                    only escape hatch and Linking.openSettings throws).
//   undetermined   → request. If still not granted, fall through.
//   denied         → request. Native dialog won't re-show after the first
//                    deny on iOS / "don't ask again" on Android, but the
//                    call still resolves;

interface WebDeniedHelp {
  title: string;
  body: string;
  buttonLabel: string;
}

async function settleOrOpenSettings(
  request: () => Promise<{ status: string }>,
  currentStatus: PermissionStatus,
  webDeniedHelp: WebDeniedHelp
): Promise<void> {
  if (currentStatus === 'granted') {
    if (Platform.OS !== 'web') await Linking.openSettings();
    return;
  }
  let next: { status: string };
  try {
    next = await request();
  } catch (e) {
    // Some browsers throw `DOMException` when the permission API is locked
    // out (iframe without permissions-policy, hardware unreachable, secure
    // context required). Surface the failure with the same browser-help
    // notify instead of silently swallowing — the action the user needs to
    // take is the same as a denied state.
    console.warn('[settings] permission request failed', e);
    void notify(webDeniedHelp);
    return;
  }
  if (next.status === 'granted') return;
  if (Platform.OS === 'web') {
    void notify(webDeniedHelp);
    return;
  }
  await Linking.openSettings();
}

function useWebDeniedHelp(): WebDeniedHelp {
  const { t } = useTranslation();
  return {
    title: t('settings.permissions.webDeniedTitle'),
    body: t('settings.permissions.webDeniedBody'),
    buttonLabel: t('common.close'),
  };
}

function LocationPermissionRow() {
  const { t } = useTranslation();
  const [perm, request] = Location.useForegroundPermissions();
  const status = normalizeStatus(perm?.status);
  const help = useWebDeniedHelp();
  const refresh = useCallback(async () => {
    // Skip while undetermined — request() would show the prompt instead of
    // a silent re-sync. Once decided, request() returns the latest status
    // without UI.
    if (perm?.status === 'undetermined' || !perm) return;
    await request();
  }, [perm, request]);
  useAppActiveRefresh(refresh);
  return (
    <PermissionRow
      testID="permission-row-location"
      label={t('settings.permissions.location.label')}
      subtitle={t('settings.permissions.location.subtitle')}
      status={status}
      onPress={() => {
        void settleOrOpenSettings(request, status, help);
      }}
    />
  );
}

function CameraPermissionRow() {
  const { t } = useTranslation();
  const [perm, request] = useCameraPermissions();
  const status = normalizeStatus(perm?.status);
  const help = useWebDeniedHelp();
  const refresh = useCallback(async () => {
    if (perm?.status === 'undetermined' || !perm) return;
    await request();
  }, [perm, request]);
  useAppActiveRefresh(refresh);
  return (
    <PermissionRow
      testID="permission-row-camera"
      label={t('settings.permissions.camera.label')}
      subtitle={t('settings.permissions.camera.subtitle')}
      status={status}
      onPress={() => {
        void settleOrOpenSettings(request, status, help);
      }}
    />
  );
}

// Read the Web Notifications API state directly — expo-notifications' web
// shim normalises everything to 'undetermined', which clashes with Chrome
// surfacing its own "this site is blocked" prompt after the user denied
// once. The native Notification API exposes the real state.
function readWebNotificationStatus(): PermissionStatus {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'undetermined';
}

async function requestWebNotification(): Promise<{ status: string; canAskAgain: boolean }> {
  if (typeof Notification === 'undefined') return { status: 'denied', canAskAgain: false };
  const result = await Notification.requestPermission();
  return {
    status: result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'undetermined',
    canAskAgain: result !== 'denied',
  };
}

function NotificationsPermissionRow() {
  const { t } = useTranslation();
  const [perm, setPerm] = useState<{ status: string; canAskAgain: boolean } | null>(() => {
    if (Platform.OS === 'web') {
      const s = readWebNotificationStatus();
      return { status: s, canAskAgain: s !== 'denied' };
    }
    return null;
  });
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    void Notifications.getPermissionsAsync().then((p) => {
      if (!cancelled) setPerm({ status: p.status, canAskAgain: p.canAskAgain });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const status = normalizeStatus(perm?.status);
  const help = useWebDeniedHelp();
  const request = useCallback(async () => {
    const next =
      Platform.OS === 'web'
        ? await requestWebNotification()
        : await Notifications.requestPermissionsAsync();
    setPerm({ status: next.status, canAskAgain: next.canAskAgain });
    return next;
  }, []);
  // Read-only refresh on app foreground — never prompts.
  const refresh = useCallback(async () => {
    if (Platform.OS === 'web') {
      const s = readWebNotificationStatus();
      setPerm({ status: s, canAskAgain: s !== 'denied' });
      return;
    }
    const p = await Notifications.getPermissionsAsync();
    setPerm({ status: p.status, canAskAgain: p.canAskAgain });
  }, []);
  useAppActiveRefresh(refresh);
  return (
    <PermissionRow
      testID="permission-row-notifications"
      label={t('settings.permissions.notifications.label')}
      subtitle={t('settings.permissions.notifications.subtitle')}
      status={status}
      onPress={() => {
        void settleOrOpenSettings(request, status, help);
      }}
    />
  );
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
