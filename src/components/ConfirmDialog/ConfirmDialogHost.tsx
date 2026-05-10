import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { useThemeVars } from '@hooks/useThemeVars';

import { registerHost, resolveCurrent, type DialogRequest } from './state';

// Mounted once at the app root (see app/_layout.tsx). Subscribes to
// module-level state pushed by `confirm()` / `notify()` / `actionSheet()`
// and renders a styled modal — same look on web and native, unlike
// Alert.alert which can't render the multi-button flow on RN-Web.
export function ConfirmDialogHost() {
  const [req, setReq] = useState<DialogRequest | null>(null);
  // RN <Modal> mounts in a separate DOM subtree on web (document.body), so
  // the theme CSS vars from the app root don't cascade in — without this,
  // semantic tokens fall back to the light palette inside the modal. On
  // native NativeWind propagates context through Modal natively, and an
  // inline `style={...vars}` actually overrides that context for the worse,
  // so the wrapper only applies the vars on web.
  const themeVars = useThemeVars();
  const themeStyle = Platform.OS === 'web' ? themeVars : undefined;

  useEffect(() => registerHost(setReq), []);

  // Resolve the pending promise immediately on tap. The Modal unmounts when
  // `current` clears (subscribe → setReq(null)); RN's built-in fade handles
  // the animation around the unmount.
  const startClose = (value: boolean | number | null): void => {
    resolveCurrent(value);
  };

  if (!req) return null;

  // Backdrop / hardware-back dismissal: action sheets resolve to `null`
  // (cancel), confirm/notify resolve to `false`.
  const dismissValue: boolean | number | null = req.kind === 'actions' ? null : false;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => startClose(dismissValue)}>
      <View style={themeStyle} className="flex-1">
        <Pressable
          testID="confirm-dialog-backdrop"
          onPress={() => startClose(dismissValue)}
          className="flex-1 bg-overlay items-center justify-center px-6">
          <Pressable
            testID="confirm-dialog-panel"
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] rounded-md bg-surface border border-stroke p-6 gap-3">
            <Text className="text-base font-bold text-text">{req.title}</Text>
            {req.body ? <Text className="text-sm text-text-dim">{req.body}</Text> : null}
            {req.kind === 'confirm' ? (
              <View className="flex-row gap-2 mt-3">
                <Pressable
                  testID="confirm-dialog-cancel"
                  onPress={() => startClose(false)}
                  accessibilityRole="button"
                  accessibilityLabel={req.cancelLabel}
                  className="flex-1 items-center justify-center rounded-md bg-surface-hi border border-stroke px-4 py-3 active:opacity-75">
                  <Text className="text-sm font-semibold text-text">{req.cancelLabel}</Text>
                </Pressable>
                <Pressable
                  testID="confirm-dialog-confirm"
                  onPress={() => startClose(true)}
                  accessibilityRole="button"
                  accessibilityLabel={req.confirmLabel}
                  className={`flex-1 items-center justify-center rounded-md px-4 py-3 active:opacity-75 ${
                    req.destructive ? 'bg-coral' : 'bg-gold'
                  }`}>
                  <Text
                    className={`text-sm font-semibold ${
                      req.destructive ? 'text-text' : 'text-on-gold'
                    }`}>
                    {req.confirmLabel}
                  </Text>
                </Pressable>
              </View>
            ) : req.kind === 'notify' ? (
              <View className="flex-row gap-2 mt-3">
                <Pressable
                  testID="confirm-dialog-ok"
                  onPress={() => startClose(false)}
                  accessibilityRole="button"
                  accessibilityLabel={req.buttonLabel}
                  className="flex-1 items-center justify-center rounded-md bg-gold px-4 py-3 active:opacity-75">
                  <Text className="text-sm font-semibold text-on-gold">{req.buttonLabel}</Text>
                </Pressable>
              </View>
            ) : (
              <View className="gap-2 mt-3">
                {req.actions.map((a, i) => (
                  <Pressable
                    key={`${i}-${a.label}`}
                    testID={`confirm-dialog-action-${i}`}
                    onPress={() => startClose(i)}
                    accessibilityRole="button"
                    accessibilityLabel={a.label}
                    className={`items-center justify-center rounded-md px-4 py-3 active:opacity-75 ${
                      a.destructive ? 'bg-coral' : 'bg-surface-hi border border-stroke'
                    }`}>
                    <Text
                      className={`text-sm font-semibold ${
                        a.destructive ? 'text-text' : 'text-text'
                      }`}>
                      {a.label}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  testID="confirm-dialog-cancel"
                  onPress={() => startClose(null)}
                  accessibilityRole="button"
                  accessibilityLabel={req.cancelLabel}
                  className="items-center justify-center rounded-md bg-surface-hi border border-stroke px-4 py-3 active:opacity-75">
                  <Text className="text-sm font-semibold text-text-dim">{req.cancelLabel}</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}
