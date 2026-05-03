// Shared XP / level math used by the award-xp edge function and any future
// caller (leaderboards, batch recompute). Keep pure — no DB, no Deno globals —
// so this file can be imported into Node tests if we ever add them.

export interface LevelInfo {
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
}

// level = floor(sqrt(xp / 50)) + 1  →  inverse: xp_for(L) = 50 * (L - 1)^2
// Curve hits L2 at 50 XP, L5 at 800 XP, L13 at ~7200 XP — feels right for
// "find +10 XP / reaction +5 XP" pacing without a separate balance table.
export function levelForXp(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = Math.floor(Math.sqrt(safeXp / 50)) + 1;
  const xpForCurrentLevel = 50 * Math.pow(level - 1, 2);
  const xpForNextLevel = 50 * Math.pow(level, 2);
  return { level, xpForCurrentLevel, xpForNextLevel };
}

export function leveledUp(prevXp: number, nextXp: number): boolean {
  return levelForXp(prevXp).level < levelForXp(nextXp).level;
}

// Streak update from yesterday's last_find_date relative to today (UTC).
// diff == 0 → same-day find, no change
// diff == 1 → consecutive day, +1
// diff >  1 → broken, reset to 1 (today's find re-seeds the streak)
// last_find_date null → first ever find, streak = 1
export interface StreakUpdate {
  streakDays: number;
  lastFindDate: string; // YYYY-MM-DD
  changed: boolean;
}

export function updateStreak(
  prevStreakDays: number,
  prevLastFindDate: string | null,
  todayIsoDate: string
): StreakUpdate {
  if (!prevLastFindDate) {
    return { streakDays: 1, lastFindDate: todayIsoDate, changed: true };
  }
  const diff = daysBetween(prevLastFindDate, todayIsoDate);
  if (diff === 0) {
    return { streakDays: prevStreakDays, lastFindDate: prevLastFindDate, changed: false };
  }
  if (diff === 1) {
    return { streakDays: prevStreakDays + 1, lastFindDate: todayIsoDate, changed: true };
  }
  return { streakDays: 1, lastFindDate: todayIsoDate, changed: true };
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

export function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Base XP per event. Source of truth — duplicated nowhere else. Edge function
// passes these into the system prompt so the model can't invent its own values.
//
// `recheck` is a no-XP event used when the client re-saves a find that
// already exists (re-photo of the same collection_item). XP and streak were
// already counted on the original save; we only re-run the achievement
// matcher to catch unlocks that may have been missed (e.g. agent failed on
// the first call, or collection was joined between saves).
export const XP_PER_EVENT = {
  find: 10,
  reaction: 5,
  collection_complete: 25,
  recheck: 0,
} as const;

export type XpEvent = keyof typeof XP_PER_EVENT;
