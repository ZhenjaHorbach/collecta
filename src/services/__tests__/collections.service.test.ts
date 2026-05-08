// collections.service is the largest service in the codebase. We don't
// re-test Supabase or Zod here — we pin the bits that bite in prod:
//
//   * forkCollection routes to the security-definer RPC and shape-checks the
//     return (RLS prevents the manual insert+items dance).
//   * addCollectionItem auto-increments sort_order from the existing max so
//     items always append at the bottom.
//   * listMyCollections + attachProgress fold the items+finds joins into the
//     `items_count` / `found_count` numbers the Collections tab shows.

/* eslint-disable import/first */
type Row = Record<string, unknown>;

const mockState = {
  rpcResult: null as unknown,
  rpcError: null as Error | null,
  collections: [] as Row[],
  items: [] as Row[],
  finds: [] as Row[],
  insertItemResult: null as Row | null,
  insertItemError: null as Error | null,
  insertItemCalls: [] as unknown[],
  maxSortRow: null as Row | null,
  insertCollectionResult: null as Row | null,
};

jest.mock('../supabase.service', () => ({
  supabase: {
    rpc: (name: string, args: unknown) => {
      void name;
      void args;
      return Promise.resolve({ data: mockState.rpcResult, error: mockState.rpcError });
    },
    from: (table: string) => {
      if (table === 'collections') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockState.collections, error: null }),
            }),
          }),
          insert: (row: unknown) => {
            void row;
            return {
              select: () => ({
                single: () => ({
                  throwOnError: () =>
                    Promise.resolve({
                      data: mockState.insertCollectionResult,
                      error: null,
                    }),
                }),
              }),
            };
          },
        };
      }
      if (table === 'collection_items') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: mockState.items, error: null }),
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: mockState.maxSortRow, error: null }),
                }),
              }),
            }),
          }),
          insert: (row: unknown) => {
            mockState.insertItemCalls.push(row);
            return {
              select: () => ({
                single: () => ({
                  throwOnError: () =>
                    Promise.resolve({
                      data: mockState.insertItemResult,
                      error: mockState.insertItemError,
                    }),
                }),
              }),
            };
          },
        };
      }
      if (table === 'finds') {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: mockState.finds, error: null }),
            }),
          }),
        };
      }
      return {};
    },
  },
}));

import { addCollectionItem, forkCollection, listMyCollections } from '../collections.service';
/* eslint-enable import/first */

const COLLECTION_FIXTURE = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  creator_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  title: 'Doors of Warsaw',
  description: null,
  icon: null,
  cover_image_url: null,
  category: 'urban',
  ai_hint: null,
  is_freeform: false,
  is_public: true,
  is_featured: false,
  forked_from: null,
  created_at: '2026-05-08T10:00:00Z',
  updated_at: '2026-05-08T10:00:00Z',
};

const ITEM_FIXTURE = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  collection_id: COLLECTION_FIXTURE.id,
  name: 'Brass knob',
  description: null,
  ai_validation_prompt: null,
  example_image_url: null,
  rarity: 'common',
  fun_fact: null,
  sort_order: 5,
  created_at: '2026-05-08T10:00:00Z',
  updated_at: '2026-05-08T10:00:00Z',
};

beforeEach(() => {
  mockState.rpcResult = null;
  mockState.rpcError = null;
  mockState.collections = [];
  mockState.items = [];
  mockState.finds = [];
  mockState.insertItemResult = null;
  mockState.insertItemError = null;
  mockState.insertItemCalls = [];
  mockState.maxSortRow = null;
  mockState.insertCollectionResult = null;
});

describe('forkCollection', () => {
  it('returns the new id from the RPC', async () => {
    mockState.rpcResult = 'new-id';
    const id = await forkCollection('source');
    expect(id).toBe('new-id');
  });

  it('throws on RPC error', async () => {
    mockState.rpcError = new Error('not_public');
    await expect(forkCollection('source')).rejects.toThrow('not_public');
  });

  it('throws on unexpected response shape', async () => {
    mockState.rpcResult = { not: 'a string' };
    await expect(forkCollection('source')).rejects.toThrow('unexpected response shape');
  });
});

describe('addCollectionItem — sort_order auto-increment', () => {
  it('starts at 0 when the collection has no items', async () => {
    mockState.maxSortRow = null;
    mockState.insertItemResult = { ...ITEM_FIXTURE, sort_order: 0 };
    await addCollectionItem(COLLECTION_FIXTURE.id, {
      name: 'Door',
      description: null,
      ai_validation_prompt: null,
      example_image_url: null,
      rarity: 'common',
      fun_fact: null,
    });
    expect(mockState.insertItemCalls[0]).toMatchObject({ sort_order: 0 });
  });

  it('appends at max + 1 when items already exist', async () => {
    mockState.maxSortRow = { sort_order: 7 };
    mockState.insertItemResult = { ...ITEM_FIXTURE, sort_order: 8 };
    await addCollectionItem(COLLECTION_FIXTURE.id, {
      name: 'Door',
      description: null,
      ai_validation_prompt: null,
      example_image_url: null,
      rarity: 'common',
      fun_fact: null,
    });
    expect(mockState.insertItemCalls[0]).toMatchObject({ sort_order: 8 });
  });
});

describe('listMyCollections — attachProgress', () => {
  it('returns counts of 0 when the collection has no items', async () => {
    mockState.collections = [COLLECTION_FIXTURE];
    mockState.items = [];
    mockState.finds = [];
    const out = await listMyCollections(COLLECTION_FIXTURE.creator_id);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ items_count: 0, found_count: 0 });
  });

  it('counts items correctly even when no finds exist yet', async () => {
    mockState.collections = [COLLECTION_FIXTURE];
    mockState.items = [
      { id: 'i1', collection_id: COLLECTION_FIXTURE.id },
      { id: 'i2', collection_id: COLLECTION_FIXTURE.id },
      { id: 'i3', collection_id: COLLECTION_FIXTURE.id },
    ];
    mockState.finds = [];
    const out = await listMyCollections(COLLECTION_FIXTURE.creator_id);
    expect(out[0]).toMatchObject({ items_count: 3, found_count: 0 });
  });

  it('counts finds against their collection_id via the items join', async () => {
    mockState.collections = [COLLECTION_FIXTURE];
    mockState.items = [
      { id: 'i1', collection_id: COLLECTION_FIXTURE.id },
      { id: 'i2', collection_id: COLLECTION_FIXTURE.id },
      { id: 'i3', collection_id: COLLECTION_FIXTURE.id },
    ];
    mockState.finds = [{ collection_item_id: 'i1' }, { collection_item_id: 'i2' }];
    const out = await listMyCollections(COLLECTION_FIXTURE.creator_id);
    expect(out[0]).toMatchObject({ items_count: 3, found_count: 2 });
  });

  it('short-circuits when the user has no collections', async () => {
    mockState.collections = [];
    const out = await listMyCollections('me');
    expect(out).toEqual([]);
  });
});
