// useFindDetail fetches a find + its reactions in parallel. Tests pin: no
// id → not loading, success populates both, error captured, viewer-null
// passes through to aggregateReactionsForFind (signed-out viewing).

/* eslint-disable import/first */
const mockGetFindById = jest.fn();
const mockAggregate = jest.fn();
jest.mock('@services/finds.service', () => ({
  getFindById: (...args: unknown[]) => mockGetFindById(...args),
}));
jest.mock('@services/reactions.service', () => ({
  aggregateReactionsForFind: (...args: unknown[]) => mockAggregate(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('../useAuth', () => ({ useAuth: () => mockUseAuth() }));

import { renderHook, waitFor } from '@testing-library/react-native';

import { useFindDetail } from '../useFindDetail';
/* eslint-enable import/first */

beforeEach(() => {
  mockGetFindById.mockReset();
  mockAggregate.mockReset();
  mockUseAuth.mockReset();
});

describe('useFindDetail', () => {
  it('skips fetching when findId is undefined', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    const { result } = renderHook(() => useFindDetail(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetFindById).not.toHaveBeenCalled();
  });

  it('passes null viewer to reactions when user is signed out', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockGetFindById.mockResolvedValue({ find: { id: 'f' } });
    mockAggregate.mockResolvedValue({ counts: {}, mine: [] });
    renderHook(() => useFindDetail('f1'));
    await waitFor(() => expect(mockAggregate).toHaveBeenCalledWith('f1', null));
  });

  it('populates both data and reactions on success', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockGetFindById.mockResolvedValue({ find: { id: 'f' } });
    mockAggregate.mockResolvedValue({ counts: { like: 1 }, mine: [] });
    const { result } = renderHook(() => useFindDetail('f1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toMatchObject({ find: { id: 'f' } });
    expect(result.current.reactions).toMatchObject({ counts: { like: 1 } });
  });

  it('captures errors', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockGetFindById.mockRejectedValue(new Error('boom'));
    mockAggregate.mockResolvedValue({ counts: {}, mine: [] });
    const { result } = renderHook(() => useFindDetail('f1'));
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
  });
});
