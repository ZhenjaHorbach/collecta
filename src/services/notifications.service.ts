// Expo push token capture. Permission flow + write-through to users.expo_push_token.
//
// We DO NOT send push from the app today — this is infra-only so the future
// delivery service (cron / edge function) has a destination per user. Capture
// runs once per session after the user is authenticated, gated behind the
// `pushNotifications` setting so users can opt out.
//
// Permissions are best-effort: the user can deny, the function returns
// silently. Failures (network, simulator without a project ID, etc) are
// logged with the [notifications] prefix per code-style.md.

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { supabase } from './supabase.service';

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // Push only works on physical devices. Simulators/emulators return no
  // valid token; bail early so we don't burn the permission prompt for
  // nothing during dev.
  if (!Device.isDevice) return null;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const { status: requested } = await Notifications.requestPermissionsAsync();
      status = requested;
    }
    if (status !== 'granted') return null;

    // Pass projectId explicitly — the SDK falls back to expoConfig.extra.eas.projectId
    // which can be undefined in development builds before expoConfig hydrates.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResponse.data;
    if (!token) return null;

    await savePushToken(userId, token);
    return token;
  } catch (e) {
    console.warn('[notifications] register failed', e);
    return null;
  }
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ expo_push_token: token })
    .eq('id', userId);
  if (error) console.warn('[notifications] saveToken failed', error);
}

export async function clearPushToken(userId: string): Promise<void> {
  const { error } = await supabase.from('users').update({ expo_push_token: null }).eq('id', userId);
  if (error) console.warn('[notifications] clearToken failed', error);
}
