// useUpdateCollection diffs draftItems vs existingItemIds and calls
// update / delete / insert sequentially. Tests pin: deleted items removed,
// retained items updated, new items inserted at index-derived sort_order,
// errors land in state.

/* eslint-disable import/first */
const mockUpdateCollection = jest.fn();
const mockUpdateItem = jest.fn();
const mockDeleteItem = jest.fn();
const mockAddItemsAt = jest.fn();

jest.mock('@services/collections.service', () => ({
  updateCollection: (...args: unknown[]) => mockUpdateCollection(...args),
  updateCollectionItem: (...args: unknown[]) => mockUpdateItem(...args),
  deleteCollectionItem: (...args: unknown[]) => mockDeleteItem(...args),
  addCollectionItemsAt: (...args: unknown[]) => mockAddItemsAt(...args),
}));

import { act, renderHook } from '@testing-library/react-native';

import { useUpdateCollection } from '../useUpdateCollection';
/* eslint-enable import/first */

const PAYLOAD = {
  collection: { title: 'Doors v2' },
  existingItemIds: ['i1', 'i2'],
  draftItems: [
    {
      dbId: 'i1',
      name: 'Door (renamed)',
      description: null,
      ai_validation_prompt: null,
      rarity: 'common' as const,
      fun_fact: null,
      example_image_url: null,
    },
    {
      // no dbId → new item
      name: 'New door',
      description: null,
      ai_validation_prompt: null,
      rarity: 'rare' as const,
      fun_fact: null,
      example_image_url: null,
    },
  ],
};

beforeEach(() => {
  mockUpdateCollection.mockReset();
  mockUpdateItem.mockReset();
  mockDeleteItem.mockReset();
  mockAddItemsAt.mockReset();
  [mockUpdateCollection, mockUpdateItem, mockDeleteItem, mockAddItemsAt].forEach((m) =>
    m.mockResolvedValue(undefined)
  );
});

describe('useUpdateCollection', () => {
  it('updates the collection row first, then deletes/updates/inserts', async () => {
    const { result } = renderHook(() => useUpdateCollection());
    let ok = false;
    await act(async () => {
      ok = await result.current.save('c1', PAYLOAD);
    });
    expect(ok).toBe(true);
    expect(mockUpdateCollection).toHaveBeenCalledWith('c1', { title: 'Doors v2' });
    // i2 was in existingItemIds but not in draftItems → delete
    expect(mockDeleteItem).toHaveBeenCalledWith('i2');
    // i1 retained → update
    expect(mockUpdateItem).toHaveBeenCalledWith(
      'i1',
      expect.objectContaining({ name: 'Door (renamed)', sort_order: 0 })
    );
    // new draft item → insert at sortOrder=1
    expect(mockAddItemsAt).toHaveBeenCalledWith(
      'c1',
      expect.arrayContaining([
        expect.objectContaining({
          input: expect.objectContaining({ name: 'New door' }),
          sortOrder: 1,
        }),
      ])
    );
  });

  it('returns false and stores error when updateCollection fails', async () => {
    mockUpdateCollection.mockRejectedValueOnce(new Error('rls'));
    const { result } = renderHook(() => useUpdateCollection());
    let ok = true;
    await act(async () => {
      ok = await result.current.save('c1', PAYLOAD);
    });
    expect(ok).toBe(false);
    expect(result.current.error?.message).toBe('rls');
    // Atomicity per the hook's comment — we bail on the first failure,
    // not even the deletes run.
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });
});
