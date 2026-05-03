// Tiny module-level event bus for surfacing achievement unlocks anywhere in
// the app. The mounted <AchievementToastHost/> in the root layout subscribes
// and renders each unlock in turn. Anyone (services, hooks) can call
// `enqueueAchievement(...)` without prop-drilling or lifting state.
//
// Same module also exposes a "profile changed" channel: gamification.service
// fires it after award-xp returns so useUserProfile re-fetches the user row
// and shows the new XP/level/streak/achievements without a screen re-mount.

import type { AchievementToastData } from '@components/AchievementToast';

type AchievementListener = (data: AchievementToastData) => void;
type ProfileListener = () => void;

const achievementListeners = new Set<AchievementListener>();
const profileListeners = new Set<ProfileListener>();

export function enqueueAchievement(data: AchievementToastData): void {
  achievementListeners.forEach((l) => l(data));
}

export function subscribeAchievements(listener: AchievementListener): () => void {
  achievementListeners.add(listener);
  return () => {
    achievementListeners.delete(listener);
  };
}

export function emitProfileChanged(): void {
  profileListeners.forEach((l) => l());
}

export function subscribeProfileChanged(listener: ProfileListener): () => void {
  profileListeners.add(listener);
  return () => {
    profileListeners.delete(listener);
  };
}
