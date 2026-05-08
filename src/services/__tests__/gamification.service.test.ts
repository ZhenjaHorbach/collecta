// gamification.awardXp must NEVER block — errors are swallowed and logged.
// On success it routes the response through the achievement-toast bus and
// fires emitProfileChanged so useUserProfile re-fetches.

/* eslint-disable import/first */
const mockInvoke = jest.fn();
jest.mock('../supabase.service', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

const mockEnqueueXp = jest.fn();
const mockEnqueueAchievement = jest.fn();
const mockEmitProfileChanged = jest.fn();

jest.mock('../achievement-toast.service', () => ({
  enqueueXp: (...args: unknown[]) => mockEnqueueXp(...args),
  enqueueAchievement: (...args: unknown[]) => mockEnqueueAchievement(...args),
  emitProfileChanged: () => mockEmitProfileChanged(),
}));

import { awardXp } from '../gamification.service';
/* eslint-enable import/first */

beforeEach(() => {
  mockInvoke.mockReset();
  mockEnqueueXp.mockReset();
  mockEnqueueAchievement.mockReset();
  mockEmitProfileChanged.mockReset();
});

describe('awardXp', () => {
  it('forwards user_id + event to the edge function', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: null });
    await awardXp('user-1', 'find');
    expect(mockInvoke).toHaveBeenCalledWith('award-xp', {
      body: { user_id: 'user-1', event: 'find' },
    });
  });

  it('enqueues the XP delta and any unlocked achievements; pings the profile bus', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        xp_delta: 10,
        new_xp: 60,
        new_level: 2,
        leveled_up: true,
        streak_days: 1,
        new_achievements: [{ code: 'first_find', title: 'First Find', icon: '📸', xp_reward: 20 }],
      },
      error: null,
    });
    await awardXp('u', 'find');
    expect(mockEnqueueXp).toHaveBeenCalledWith(10);
    expect(mockEnqueueAchievement).toHaveBeenCalledWith({
      code: 'first_find',
      title: 'First Find',
      icon: '📸',
      xpReward: 20,
    });
    expect(mockEmitProfileChanged).toHaveBeenCalledTimes(1);
  });

  it('swallows error responses — never throws', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('502') });
    await expect(awardXp('u', 'find')).resolves.toBeUndefined();
    expect(mockEnqueueXp).not.toHaveBeenCalled();
    expect(mockEmitProfileChanged).not.toHaveBeenCalled();
  });

  it('swallows thrown rejections — never throws', async () => {
    mockInvoke.mockRejectedValue(new Error('network'));
    await expect(awardXp('u', 'reaction')).resolves.toBeUndefined();
  });

  it('does nothing when data is missing (defensive)', async () => {
    mockInvoke.mockResolvedValue({ data: undefined, error: null });
    await awardXp('u', 'find');
    expect(mockEnqueueXp).not.toHaveBeenCalled();
  });
});
