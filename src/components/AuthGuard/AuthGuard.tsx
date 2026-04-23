import { useAuth } from '@hooks/useAuth';
import { useColors } from '@hooks/useColors';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, type PropsWithChildren } from 'react';
import { ActivityIndicator, View } from 'react-native';

const AUTH_GROUP = 'auth';
const TABS_GROUP = '(tabs)';

export function AuthGuard({ children }: PropsWithChildren) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === AUTH_GROUP;
    if (!session && !inAuthGroup) {
      router.replace(`/${AUTH_GROUP}`);
    } else if (session && inAuthGroup) {
      router.replace(`/${TABS_GROUP}`);
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return <>{children}</>;
}
