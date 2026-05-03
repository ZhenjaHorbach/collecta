// Tiny module-level event bus for surfacing achievement unlocks anywhere in
// the app. The mounted <AchievementToastHost/> in the root layout subscribes
// and renders each unlock in turn. Anyone (services, hooks) can call
// `enqueueAchievement(...)` without prop-drilling or lifting state.

import type { AchievementToastData } from '@components/AchievementToast';

type Listener = (data: AchievementToastData) => void;

const listeners = new Set<Listener>();

export function enqueueAchievement(data: AchievementToastData): void {
  listeners.forEach((l) => l(data));
}

export function subscribeAchievements(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
