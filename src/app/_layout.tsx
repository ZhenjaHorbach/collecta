import '../../global.css';

import { AuthGuard } from '@components/AuthGuard';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { connector, db } from '@services/database.service';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

export default function RootLayout() {
  useEffect(() => {
    db.connect(connector);
    return () => {
      db.disconnect();
    };
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <View className="flex-1 bg-bg">
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
        <StatusBar style="light" />
      </View>
    </ThemeProvider>
  );
}
