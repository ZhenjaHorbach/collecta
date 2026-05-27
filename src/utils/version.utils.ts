import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

export interface BuildIdentity {
  /** Marketing version from app.json (`1.0.0`). */
  marketingVersion: string;
  /** Native build counter — Android versionCode / iOS buildNumber. */
  nativeBuild: string;
  /** First 8 chars of the current OTA update id, or `"embedded"` when the app
   *  is running the bundle that shipped in the AAB / IPA (no OTA applied). */
  otaId: string;
}

const MISSING = '—';
const EMBEDDED = 'embedded';

/**
 * Reads the running app's build identity from the platform — read at render
 * time, never cache. `Updates.updateId` changes after the next launch when an
 * OTA replaces the JS bundle, so a cached value would silently lie about
 * which bundle the user is actually on.
 */
export function getBuildIdentity(): BuildIdentity {
  return {
    marketingVersion: Constants.expoConfig?.version ?? MISSING,
    nativeBuild: Application.nativeBuildVersion ?? MISSING,
    otaId: Updates.updateId ? Updates.updateId.slice(0, 8) : EMBEDDED,
  };
}

/**
 * Renders a build identity into a single tester-pasteable string.
 * Example: `1.0.0 · build 2 · dd970ef7`.
 */
export function formatBuildIdentity(id: BuildIdentity): string {
  return `${id.marketingVersion} · build ${id.nativeBuild} · ${id.otaId}`;
}
