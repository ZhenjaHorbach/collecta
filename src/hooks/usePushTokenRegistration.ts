// Captures the Expo push token once per signed-in session, gated by the
// `pushNotifications` setting. Mounted from the root layout so registration
// kicks in immediately after AuthGuard hands control to a tab/route — it's
// fire-and-forget; nothing blocks render.
//
// We only attempt registration ONCE per session (per userId) — the token is
// stable for the install, so re-asking on every mount would just re-write
// the same row. If the user later toggles the setting on, the next app
// launch picks them up.

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { clearPushToken, registerForPushNotifications } from '@services/notifications.service';

import { useAuth } from './useAuth';
import { useSetting } from './useSetting';

export function usePushTokenRegistration(): void {
  const { user, loading } = useAuth();
  const [enabled] = useSetting('pushNotifications');
  const attemptedFor = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user || !enabled) return;
    if (Platform.OS === 'web') return;
    if (attemptedFor.current === user.id) return;
    attemptedFor.current = user.id;
    void registerForPushNotifications(user.id);
  }, [user, loading, enabled]);

  // When the user opts out, clear the stored token so a future delivery
  // service won't push to a disabled device. Reset the per-session guard
  // so opting back in re-registers.
  useEffect(() => {
    if (loading || !user || enabled) return;
    if (Platform.OS === 'web') return;
    attemptedFor.current = null;
    void clearPushToken(user.id);
  }, [user, loading, enabled]);
}
