// useActiveCollection: MMKV-backed state for the camera viewfinder chip.
// Tests pin: hydrate from storage on mount, write on set, delete when null.

/* eslint-disable import/first */
const mockBackend = new Map<string, unknown>();

jest.mock('@services/storage.service', () => ({
  Storage: {
    get: <T>(key: string): T | undefined => mockBackend.get(key) as T | undefined,
    set: <T>(key: string, value: T): void => {
      mockBackend.set(key, value);
    },
    delete: (key: string): void => {
      mockBackend.delete(key);
    },
  },
  StorageKeys: { activeCollectionId: 'active_collection_id' },
}));

import { act, renderHook } from '@testing-library/react-native';

import { useActiveCollection } from '../useActiveCollection';
/* eslint-enable import/first */

beforeEach(() => mockBackend.clear());

describe('useActiveCollection', () => {
  it('hydrates from MMKV on mount', () => {
    mockBackend.set('active_collection_id', 'c1');
    const { result } = renderHook(() => useActiveCollection());
    expect(result.current.activeCollectionId).toBe('c1');
  });

  it('starts null when nothing stored', () => {
    const { result } = renderHook(() => useActiveCollection());
    expect(result.current.activeCollectionId).toBeNull();
  });

  it('persists to MMKV when setActive is called', () => {
    const { result } = renderHook(() => useActiveCollection());
    act(() => {
      result.current.setActive('c2');
    });
    expect(result.current.activeCollectionId).toBe('c2');
    expect(mockBackend.get('active_collection_id')).toBe('c2');
  });

  it('deletes the MMKV key when set to null', () => {
    mockBackend.set('active_collection_id', 'c1');
    const { result } = renderHook(() => useActiveCollection());
    act(() => {
      result.current.setActive(null);
    });
    expect(result.current.activeCollectionId).toBeNull();
    expect(mockBackend.has('active_collection_id')).toBe(false);
  });
});
