// Fire-and-forget bridge to the award-xp edge function. Every gamification
// event (find / reaction / collection complete) flows through here so the
// agent loop runs in exactly one place. The function returns nothing — toasts
// are emitted via achievement-toast.service so any caller benefits without
// owning toast state.
//
// Errors are swallowed and logged: gamification must never block the user's
// primary action. If award-xp is down, the next successful invocation will
// reconcile (achievements check unlocked codes from the DB, not from previous
// requests).

import { emitProfileChanged, enqueueAchievement } from './achievement-toast.service';
import { supabase } from './supabase.service';

export type GamificationEvent = 'find' | 'reaction' | 'collection_complete' | 'recheck';

interface AwardXpResponse {
  xp_delta: number;
  new_xp: number;
  new_level: number;
  leveled_up: boolean;
  streak_days: number;
  new_achievements: {
    code: string;
    title: string;
    icon: string;
    xp_reward: number;
  }[];
}

export async function awardXp(userId: string, event: GamificationEvent): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke<AwardXpResponse>('award-xp', {
      body: { user_id: userId, event },
    });
    if (error) {
      console.warn('[gamification] award-xp failed', error);
      return;
    }
    if (!data) return;
    for (const a of data.new_achievements) {
      enqueueAchievement({
        code: a.code,
        title: a.title,
        icon: a.icon,
        xpReward: a.xp_reward,
      });
    }
    // Tell any mounted useUserProfile hook to re-fetch — the user row just
    // changed (xp/level/streak) and possibly user_achievements gained rows.
    // Cheaper than realtime subscription, no setup overhead.
    emitProfileChanged();
  } catch (e) {
    console.warn('[gamification] award-xp threw', e);
  }
}
