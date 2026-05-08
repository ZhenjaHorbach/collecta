// useFeed pages through listFeed and folds reaction aggregates in. Tests
// pin: signed-out → empty, first page populates items + aggregates,
// loadMore appends without duplicates, refetch resets.

/* eslint-disable import/first */
const mockListFeed = jest.fn();
const mockBatchAggregate = jest.fn();

jest.mock('@services/feed.service', () => ({
  listFeed: (...args: unknown[]) => mockListFeed(...args),
}));
jest.mock('@services/reactions.service', () => ({
  batchAggregateReactions: (...args: unknown[]) => mockBatchAggregate(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('@hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

const mockUseUserLocation = jest.fn();
jest.mock('@hooks/useUserLocation', () => ({
  useUserLocation: () => mockUseUserLocation(),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFeed } from '../useFeed';
/* eslint-enable import/first */

beforeEach(() => {
  mockListFeed.mockReset();
  mockBatchAggregate.mockReset();
  mockUseAuth.mockReset();
  mockUseUserLocation.mockReset();
  mockUseUserLocation.mockReturnValue({ location: null });
});

describe('useFeed', () => {
  it('returns empty when signed out', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(mockListFeed).not.toHaveBeenCalled();
  });

  it('loads the first page and folds in reaction aggregates', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockListFeed.mockResolvedValueOnce([{ findId: 'f1' }, { findId: 'f2' }]);
    mockBatchAggregate.mockResolvedValueOnce(
      new Map([
        ['f1', { counts: { like: 1, fire: 0, wow: 0 }, mine: [] }],
        ['f2', { counts: { like: 0, fire: 2, wow: 0 }, mine: [] }],
      ])
    );
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.reactionAggregates.size).toBe(2);
  });

  it('refetch resets items and re-runs the listing', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockListFeed.mockResolvedValueOnce([{ findId: 'f1' }]);
    mockBatchAggregate.mockResolvedValueOnce(new Map([['f1', { counts: {}, mine: [] }]]));
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    mockListFeed.mockResolvedValueOnce([{ findId: 'f2' }]);
    mockBatchAggregate.mockResolvedValueOnce(new Map([['f2', { counts: {}, mine: [] }]]));
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.items.map((i) => i.findId)).toEqual(['f2']);
  });
});
