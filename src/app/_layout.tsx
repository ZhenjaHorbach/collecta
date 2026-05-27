import '@i18n';
import '../../global.css';

import { AchievementToastHost } from '@components/AchievementToast';
import { AuthGuard } from '@components/AuthGuard';
import { ConfirmDialogHost } from '@components/ConfirmDialog';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { XpPopupHost } from '@components/XpPopup';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useDbLifecycle } from '@hooks/useDbLifecycle';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { usePushTokenRegistration } from '@hooks/usePushTokenRegistration';
import { useTheme } from '@hooks/useTheme';
import { useThemeVars } from '@hooks/useThemeVars';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

export default function RootLayout() {
  const { resolved } = useTheme();
  const themeVars = useThemeVars();

  useFonts(MaterialIcons.font);
  usePushTokenRegistration();
  useDbLifecycle();
  useDocumentTitle();

  const isDark = resolved === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <View style={themeVars} className="flex-1 bg-bg">
          <ErrorBoundary>
            <AuthGuard>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="collection/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="find/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
                <Stack.Screen
                  name="collection/create"
                  options={{ headerShown: false, presentation: 'modal' }}
                />
                <Stack.Screen
                  name="collection/edit/[id]"
                  options={{ headerShown: false, presentation: 'modal' }}
                />
                <Stack.Screen
                  name="settings"
                  options={{ headerShown: false, presentation: 'modal' }}
                />
              </Stack>
            </AuthGuard>
            <XpPopupHost />
            <AchievementToastHost />
            <ConfirmDialogHost />
          </ErrorBoundary>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </View>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
