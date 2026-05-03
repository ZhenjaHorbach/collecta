// Streak is advanced lazily inside the award-xp edge function on every find.
// That means a user who skipped 3 days will still have the OLD streak_days in
// the DB until their next find. For UI purposes we shouldn't lie — if the last
// find is older than yesterday, render 0 even though the row says e.g. 12.
//
// Pure helper, no side effects, so the cosmetic rule lives in one place that
// both ProfileScreen and any future leaderboard can call.

export function getDisplayStreak(streakDays: number, lastFindDate: string | null): number {
  if (!lastFindDate) return 0;
  const today = todayUtcIso();
  const diff = daysBetween(lastFindDate, today);
  if (diff <= 1) return streakDays;
  return 0;
}

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.UTC(
    Number(fromIso.slice(0, 4)),
    Number(fromIso.slice(5, 7)) - 1,
    Number(fromIso.slice(8, 10))
  );
  const to = Date.UTC(
    Number(toIso.slice(0, 4)),
    Number(toIso.slice(5, 7)) - 1,
    Number(toIso.slice(8, 10))
  );
  return Math.round((to - from) / 86_400_000);
}

// Mirrors supabase/functions/_shared/leveling.ts. Duplicated intentionally —
// edge functions can't import from src/, and bundling Deno code into RN is
// painful. Keep the formula identical; touched together when balancing.
export interface LevelInfo {
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
}

export function levelForXp(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = Math.floor(Math.sqrt(safeXp / 50)) + 1;
  const xpForCurrentLevel = 50 * Math.pow(level - 1, 2);
  const xpForNextLevel = 50 * Math.pow(level, 2);
  return { level, xpForCurrentLevel, xpForNextLevel };
}
