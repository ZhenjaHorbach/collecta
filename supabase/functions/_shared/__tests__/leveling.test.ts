// Source-of-truth tests for XP / level math used by award-xp.
// `leveling.ts` is also mirrored in src/utils/streak.utils.ts (client copy);
// both files must agree on XP_PER_EVENT and the levelForXp formula. See
// .claude/rules/gamification.md.

import { XP_PER_EVENT, levelForXp, leveledUp, todayUtcIso, updateStreak } from '../leveling';

describe('XP_PER_EVENT', () => {
  it('matches the documented values', () => {
    // Fence test: these values are rendered into the agent system prompt
    // (award-xp). Changing them needs a coordinated update of:
    //   - supabase/functions/_shared/leveling.ts  (this constant)
    //   - src/utils/streak.utils.ts                (client mirror)
    //   - .claude/rules/gamification.md            (the table)
    expect(XP_PER_EVENT).toEqual({
      find: 10,
      reaction: 5,
      collection_complete: 25,
      recheck: 0,
    });
  });
});

describe('levelForXp', () => {
  it('starts at level 1 with zero XP', () => {
    expect(levelForXp(0)).toEqual({
      level: 1,
      xpForCurrentLevel: 0,
      xpForNextLevel: 50,
    });
  });

  it('treats negative XP as zero (defensive — XP is never negative in DB)', () => {
    expect(levelForXp(-100).level).toBe(1);
  });

  it('floors fractional XP — DB only ever stores integers, but be safe', () => {
    expect(levelForXp(49.9).level).toBe(1);
    expect(levelForXp(50.1).level).toBe(2);
  });

  it.each([
    [49, 1],
    [50, 2],
    [199, 2],
    [200, 3],
    [799, 4],
    [800, 5],
    [7199, 12],
    [7200, 13],
  ])('xp=%i → level %i', (xp, level) => {
    expect(levelForXp(xp).level).toBe(level);
  });

  it('reports xpForCurrentLevel and xpForNextLevel as the curve boundaries', () => {
    const info = levelForXp(820); // mid level 5
    expect(info.level).toBe(5);
    expect(info.xpForCurrentLevel).toBe(800); // 50 * (5-1)^2
    expect(info.xpForNextLevel).toBe(1250); // 50 * 5^2
  });

  it('is monotone — XP up ⇒ level same or up', () => {
    let prev = levelForXp(0).level;
    for (let xp = 0; xp <= 10_000; xp += 47) {
      const next = levelForXp(xp).level;
      expect(next).toBeGreaterThanOrEqual(prev);
      prev = next;
    }
  });
});

describe('leveledUp', () => {
  it('detects a level boundary crossing', () => {
    expect(leveledUp(49, 50)).toBe(true);
    expect(leveledUp(799, 800)).toBe(true);
  });

  it('returns false when both XP values stay inside the same level', () => {
    expect(leveledUp(50, 199)).toBe(false);
    expect(leveledUp(0, 49)).toBe(false);
  });

  it('returns false on equal XP', () => {
    expect(leveledUp(123, 123)).toBe(false);
  });
});

describe('updateStreak', () => {
  it('seeds streak at 1 for first-ever find', () => {
    const r = updateStreak(0, null, '2026-05-08');
    expect(r).toEqual({ streakDays: 1, lastFindDate: '2026-05-08', changed: true });
  });

  it('does nothing on a same-day repeat find', () => {
    const r = updateStreak(7, '2026-05-08', '2026-05-08');
    expect(r).toEqual({ streakDays: 7, lastFindDate: '2026-05-08', changed: false });
  });

  it('increments by 1 on a consecutive-day find', () => {
    const r = updateStreak(7, '2026-05-07', '2026-05-08');
    expect(r).toEqual({ streakDays: 8, lastFindDate: '2026-05-08', changed: true });
  });

  it('resets to 1 when more than one day passed', () => {
    const r = updateStreak(12, '2026-05-05', '2026-05-08'); // 3-day gap
    expect(r).toEqual({ streakDays: 1, lastFindDate: '2026-05-08', changed: true });
  });

  it('crosses month boundaries correctly', () => {
    const r = updateStreak(3, '2026-04-30', '2026-05-01');
    expect(r.streakDays).toBe(4);
  });

  it('crosses year boundaries correctly', () => {
    const r = updateStreak(10, '2026-12-31', '2027-01-01');
    expect(r.streakDays).toBe(11);
  });
});

describe('todayUtcIso', () => {
  it('returns YYYY-MM-DD in UTC', () => {
    expect(todayUtcIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches the UTC date independent of local timezone', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-08T23:30:00Z'));
    try {
      expect(todayUtcIso()).toBe('2026-05-08');
    } finally {
      jest.useRealTimers();
    }
  });
});
