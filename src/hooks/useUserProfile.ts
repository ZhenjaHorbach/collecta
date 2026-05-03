import { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
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
        if (cancelled) return;

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
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { profile, loading, error };
}
