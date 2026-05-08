// achievement-toast.service is a tiny module-level event bus. The bug
// it can't have: a leaked subscription that fires after the host unmounted.
// Tests pin: subscribe → notify, unsubscribe → silence, multiple buses
// stay isolated, enqueueXp(0) is a no-op (XP popup never blinks empty).

import {
  emitProfileChanged,
  enqueueAchievement,
  enqueueXp,
  subscribeAchievements,
  subscribeProfileChanged,
  subscribeXp,
} from '../achievement-toast.service';

import type { AchievementToastData } from '@components/AchievementToast';

const SAMPLE: AchievementToastData = {
  code: 'first_find',
  title: 'First Find',
  icon: '📸',
  xpReward: 20,
};

describe('achievement bus', () => {
  it('delivers enqueued data to every subscriber', () => {
    const a = jest.fn();
    const b = jest.fn();
    const unA = subscribeAchievements(a);
    const unB = subscribeAchievements(b);
    enqueueAchievement(SAMPLE);
    expect(a).toHaveBeenCalledWith(SAMPLE);
    expect(b).toHaveBeenCalledWith(SAMPLE);
    unA();
    unB();
  });

  it('does not call a listener after unsubscribe', () => {
    const fn = jest.fn();
    const un = subscribeAchievements(fn);
    un();
    enqueueAchievement(SAMPLE);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('profile-changed bus', () => {
  it('fires zero-arg notifications', () => {
    const fn = jest.fn();
    const un = subscribeProfileChanged(fn);
    emitProfileChanged();
    emitProfileChanged();
    expect(fn).toHaveBeenCalledTimes(2);
    un();
  });
});

describe('xp bus', () => {
  it('forwards positive deltas', () => {
    const fn = jest.fn();
    const un = subscribeXp(fn);
    enqueueXp(10);
    expect(fn).toHaveBeenCalledWith(10);
    un();
  });

  it('drops zero/negative deltas — popup never blinks empty', () => {
    const fn = jest.fn();
    const un = subscribeXp(fn);
    enqueueXp(0);
    enqueueXp(-5);
    expect(fn).not.toHaveBeenCalled();
    un();
  });
});

describe('isolation between buses', () => {
  it('an achievement listener never receives XP events and vice versa', () => {
    const ach = jest.fn();
    const xp = jest.fn();
    const unA = subscribeAchievements(ach);
    const unX = subscribeXp(xp);
    enqueueAchievement(SAMPLE);
    enqueueXp(5);
    expect(ach).toHaveBeenCalledTimes(1);
    expect(xp).toHaveBeenCalledTimes(1);
    unA();
    unX();
  });
});
