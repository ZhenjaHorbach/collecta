import { Spinner } from '@components/Spinner';
import { useAuth } from '@hooks/useAuth';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, type PropsWithChildren } from 'react';

const AUTH_GROUP = 'auth';
const TABS_GROUP = '(tabs)';

export function AuthGuard({ children }: PropsWithChildren) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
    return <Spinner className="bg-bg" />;
  }

  return <>{children}</>;
}
