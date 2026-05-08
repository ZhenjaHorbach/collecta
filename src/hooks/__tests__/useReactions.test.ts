// useReactions does an optimistic toggle: count + my-mark flip locally
// before the server call. Tests pin: initial aggregate seeds state, toggle
// updates immediately, server failure reverts.

/* eslint-disable import/first */
const mockToggle = jest.fn();
const mockAggregate = jest.fn();

jest.mock('@services/reactions.service', () => ({
  toggleReaction: (...args: unknown[]) => mockToggle(...args),
  aggregateReactionsForFind: (...args: unknown[]) => mockAggregate(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('@hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

import { act, renderHook } from '@testing-library/react-native';

import { useReactions } from '../useReactions';
/* eslint-enable import/first */

beforeEach(() => {
  mockToggle.mockReset();
  mockAggregate.mockReset();
  mockUseAuth.mockReset();
});

describe('useReactions', () => {
  it('seeds counts and mine from initialAggregate (skips per-item fetch)', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    const { result } = renderHook(() =>
      useReactions('f1', {
        counts: { like: 3, fire: 1, wow: 0 },
        mine: ['like'],
      })
    );
    expect(result.current.counts).toEqual({ like: 3, fire: 1, wow: 0 });
    expect(result.current.mine.has('like')).toBe(true);
    expect(mockAggregate).not.toHaveBeenCalled();
  });

  it('optimistically increments count when adding a reaction', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockToggle.mockResolvedValue('added');
    const { result } = renderHook(() =>
      useReactions('f1', { counts: { like: 0, fire: 0, wow: 0 }, mine: [] })
    );
    await act(async () => {
      await result.current.toggle('like');
    });
    expect(result.current.counts.like).toBe(1);
    expect(result.current.mine.has('like')).toBe(true);
  });

  it('reverts the optimistic change when the server call fails', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockToggle.mockRejectedValue(new Error('rls'));
    const { result } = renderHook(() =>
      useReactions('f1', { counts: { like: 0, fire: 0, wow: 0 }, mine: [] })
    );
    await act(async () => {
      await result.current.toggle('like');
    });
    expect(result.current.counts.like).toBe(0);
    expect(result.current.mine.has('like')).toBe(false);
  });
});
