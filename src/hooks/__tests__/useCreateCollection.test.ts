// useCreateCollection: typed mutation that auth-gates, calls
// createCollection then optionally addCollectionItems, surfaces errors.

/* eslint-disable import/first */
const mockCreateCollection = jest.fn();
const mockAddItems = jest.fn();

jest.mock('@services/collections.service', () => ({
  createCollection: (...args: unknown[]) => mockCreateCollection(...args),
  addCollectionItems: (...args: unknown[]) => mockAddItems(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('@hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

import { act, renderHook } from '@testing-library/react-native';

import { useCreateCollection } from '../useCreateCollection';
/* eslint-enable import/first */

const PAYLOAD = {
  collection: { title: 'Doors', description: null, category: 'urban' },
  items: [],
};

beforeEach(() => {
  mockCreateCollection.mockReset();
  mockAddItems.mockReset();
  mockUseAuth.mockReset();
});

describe('useCreateCollection', () => {
  it('returns null and surfaces error when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useCreateCollection());
    let id: string | null = null;
    await act(async () => {
      id = await result.current.submit(PAYLOAD as any);
    });
    expect(id).toBeNull();
    expect(result.current.error?.message).toBe('Not authenticated');
    expect(mockCreateCollection).not.toHaveBeenCalled();
  });

  it('creates the collection and skips items when none given', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockCreateCollection.mockResolvedValue({ id: 'new-id' });
    const { result } = renderHook(() => useCreateCollection());
    let id: string | null = null;
    await act(async () => {
      id = await result.current.submit(PAYLOAD as any);
    });
    expect(id).toBe('new-id');
    expect(mockCreateCollection).toHaveBeenCalledWith(
      expect.objectContaining({ creator_id: 'u', title: 'Doors' })
    );
    expect(mockAddItems).not.toHaveBeenCalled();
  });

  it('calls addCollectionItems when items are provided', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockCreateCollection.mockResolvedValue({ id: 'new-id' });
    mockAddItems.mockResolvedValue([]);
    const { result } = renderHook(() => useCreateCollection());
    await act(async () => {
      await result.current.submit({
        ...PAYLOAD,
        items: [{ name: 'Door' }],
      } as any);
    });
    expect(mockAddItems).toHaveBeenCalledWith('new-id', [{ name: 'Door' }]);
  });

  it('surfaces createCollection errors', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockCreateCollection.mockRejectedValue(new Error('rls'));
    const { result } = renderHook(() => useCreateCollection());
    let id: string | null = 'sentinel';
    await act(async () => {
      id = await result.current.submit(PAYLOAD as any);
    });
    expect(id).toBeNull();
    expect(result.current.error?.message).toBe('rls');
  });
});
