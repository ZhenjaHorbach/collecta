import { useCallback, useEffect, useState } from 'react';

import { subscribeProfileChanged } from '@services/achievement-toast.service';
import { supabase } from '@services/supabase.service';

interface AchievementCatalogRow {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  sort_order: number;
}

export interface ProfileAchievement extends AchievementCatalogRow {
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  xp: number;
  level: number;
  streakDays: number;
  lastFindDate: string | null;
  findsCount: number;
  collectionsJoined: number;
  achievements: ProfileAchievement[];
}

export function useUserProfile(userId: string | null | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(
    async (signal: { cancelled: boolean }, withSpinner: boolean): Promise<void> => {
      if (!userId) return;
      if (withSpinner) setLoading(true);
      setError(null);
      try {
        const [
          { data: user, error: userErr },
          { data: catalog, error: catalogErr },
          { data: unlocked, error: unlockedErr },
          { count: findsCount },
          { count: collectionsJoined },
        ] = await Promise.all([
          supabase
            .from('users')
            .select(
              'id, username, display_name, avatar_url, bio, xp, level, streak_days, last_find_date'
            )
            .eq('id', userId)
            .single(),
          supabase
            .from('achievements')
            .select('id, code, title, description, icon, xp_reward, sort_order')
            .order('sort_order', { ascending: true }),
          supabase
            .from('user_achievements')
            .select('achievement_id, unlocked_at')
            .eq('user_id', userId),
          supabase.from('finds').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase
            .from('user_collections')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
        ]);

        if (userErr) throw userErr;
        if (catalogErr) throw catalogErr;
        if (unlockedErr) throw unlockedErr;
        if (signal.cancelled) return;

        const unlockedById = new Map<string, string>(
          (unlocked ?? []).map((r) => [r.achievement_id as string, r.unlocked_at as string])
        );
        const achievements: ProfileAchievement[] = (catalog ?? []).map(
          (a: AchievementCatalogRow) => ({
            ...a,
            unlocked: unlockedById.has(a.id),
            unlockedAt: unlockedById.get(a.id) ?? null,
          })
        );

        setProfile({
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          xp: user.xp ?? 0,
          level: user.level ?? 1,
          streakDays: user.streak_days ?? 0,
          lastFindDate: (user.last_find_date as string | null) ?? null,
          findsCount: findsCount ?? 0,
          collectionsJoined: collectionsJoined ?? 0,
          achievements,
        });
      } catch (e) {
        if (!signal.cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!signal.cancelled && withSpinner) setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const signal = { cancelled: false };
    void fetchProfile(signal, true);

    // Re-fetch (silently, no spinner flash) whenever award-xp lands a new
    // event for this user. Keeps the profile XP/level/streak/achievements
    // in sync without a screen re-mount.
    const unsubscribe = subscribeProfileChanged(() => {
      void fetchProfile(signal, false);
    });

    return () => {
      signal.cancelled = true;
      unsubscribe();
    };
  }, [userId, fetchProfile]);

  return { profile, loading, error };
}
