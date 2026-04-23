import '../../global.css';
import '@i18n';

import { AuthGuard } from '@components/AuthGuard';
import { useTheme } from '@hooks/useTheme';
import { useThemeVars } from '@hooks/useThemeVars';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { connector, db } from '@services/database.service';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

export default function RootLayout() {
  const { resolved } = useTheme();
  const themeVars = useThemeVars();

  useEffect(() => {
    db.connect(connector);
    return () => {
      db.disconnect();
    };
  }, []);

  const isDark = resolved === 'dark';

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <View style={themeVars} className="flex-1 bg-bg">
        <AuthGuard>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="collection/[id]" options={{ headerShown: false }} />
            <Stack.Screen
              name="collection/create"
              options={{ headerShown: false, presentation: 'modal' }}
            />
          </Stack>
        </AuthGuard>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    </ThemeProvider>
  );
}
