import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

const APP_NAME = 'Collecta';

// Map a router pathname to an i18n key for the browser tab title. Keep
// this in sync with src/app/(tabs)/_layout.tsx and the route definitions
// in src/app/_layout.tsx — adding a new tab or top-level route means
// adding a branch here.
function pathToTitleKey(pathname: string): string | null {
  if (pathname.startsWith('/settings')) return 'profile.settings';
  if (pathname.startsWith('/collection/edit')) return 'collections.edit.trigger';
  if (pathname.startsWith('/collection/create')) return 'collections.newCollection';
  if (pathname.startsWith('/collection/')) return 'collections.title';
  if (pathname.startsWith('/find/')) return 'find.headerTitle';
  if (pathname.startsWith('/user/')) return 'tabs.profile';
  if (pathname.endsWith('/map')) return 'tabs.map';
  if (pathname.endsWith('/camera')) return 'tabs.camera';
  if (pathname.endsWith('/collections')) return 'tabs.collections';
  if (pathname.endsWith('/profile')) return 'tabs.profile';
  if (pathname === '/' || pathname.startsWith('/(tabs)')) return 'tabs.feed';
  return null;
}

// Browser tab title — Expo Router's static renderer doesn't inject a
// `<title>` in dev / SPA mode, so the tab falls back to the raw URL.
// Setting `document.title` on every pathname change gives a clean
// per-route title on web; native ignores this branch entirely.
export function useDocumentTitle(): void {
  const pathname = usePathname();
  const { t } = useTranslation();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;
    const key = pathToTitleKey(pathname);
    if (!key && __DEV__) {
      // Surface unregistered routes during development so a new screen
      // doesn't ship with the bare app name as its tab title. Production
      // bundles strip this warning under the standard `__DEV__` guard.
      console.warn('[useDocumentTitle] no title key for pathname:', pathname);
    }
    document.title = key ? `${t(key)} — ${APP_NAME}` : APP_NAME;
  }, [pathname, t]);
}
