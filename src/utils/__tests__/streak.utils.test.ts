// streak.utils.ts mirrors supabase/functions/_shared/leveling.ts. Both copies
// must stay in sync — if a test changes here, mirror the change in
// supabase/functions/_shared/__tests__/leveling.test.ts and vice versa.

import {
  XP_PER_COLLECTION_COMPLETE,
  XP_PER_FIND,
  XP_PER_REACTION,
  getDisplayStreak,
  levelForXp,
} from '../streak.utils';

describe('XP constants mirror the server', () => {
  it('matches server XP_PER_EVENT values', () => {
    // Drift here is the loudest failure mode: server awards X, client renders Y.
    // Hard-coded numbers (not re-imports of the server file) are deliberate —
    // the test is the contract between the two copies.
    expect(XP_PER_FIND).toBe(10);
    expect(XP_PER_REACTION).toBe(5);
    expect(XP_PER_COLLECTION_COMPLETE).toBe(25);
  });
});

describe('getDisplayStreak', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-08T12:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders 0 when the user has never recorded a find', () => {
    expect(getDisplayStreak(0, null)).toBe(0);
    // Even if the DB somehow has a streakDays > 0 with no lastFindDate,
    // we render the safe value rather than the impossible one.
    expect(getDisplayStreak(99, null)).toBe(0);
  });

  it('keeps the DB streak when the last find is today', () => {
    expect(getDisplayStreak(7, '2026-05-08')).toBe(7);
  });

  it('keeps the DB streak when the last find was yesterday (still alive)', () => {
    expect(getDisplayStreak(7, '2026-05-07')).toBe(7);
  });

  it('renders 0 cosmetically when the streak is broken (>1 day gap)', () => {
    // The DB still says 12; the next find on the user's side will reset it
    // to 1. Until then we never lie to the user about an alive streak.
    expect(getDisplayStreak(12, '2026-05-05')).toBe(0);
  });

  it('renders 0 even for very old streaks', () => {
    expect(getDisplayStreak(365, '2025-01-01')).toBe(0);
  });
});

describe('levelForXp (client mirror)', () => {
  // These cases mirror the server-side leveling.test.ts. If you add a case
  // there, add it here. The point is to catch drift between the two files.
  it.each([
    [0, 1],
    [49, 1],
    [50, 2],
    [799, 4],
    [800, 5],
    [7200, 13],
  ])('xp=%i → level %i', (xp, level) => {
    expect(levelForXp(xp).level).toBe(level);
  });

  it('reports the same boundaries as the server formula', () => {
    const info = levelForXp(820);
    expect(info.xpForCurrentLevel).toBe(800);
    expect(info.xpForNextLevel).toBe(1250);
  });
});
