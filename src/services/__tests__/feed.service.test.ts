// Verifies feed.service.listFeed correctly hydrates RPC rows with creator +
// collection + item joins and preserves RPC ordering. The RPC itself
// (get_personalized_feed) is what computes the x3-shared-collection /
// x2-nearby weighting — that lives in SQL and is out of scope for Jest. Test
// it via pg-tap or an integration fixture if it ever needs coverage.

/* eslint-disable import/first */
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('../supabase.service', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { listFeed } from '../feed.service';
/* eslint-enable import/first */

interface FromBuilderState {
  table: string;
}

// Builds a thenable that mimics the bits of the Supabase query builder we use:
// .select(..).in(..).returns<T>() → resolves to { data, error }.
function makeFromBuilder(table: string, dataByTable: Record<string, unknown>) {
  const state: FromBuilderState = { table };
  const builder = {
    select: () => builder,
    in: () => builder,
    returns: () => builder,
    // The real client's builder is thenable; awaiting it triggers the request.
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      resolve({ data: dataByTable[state.table] ?? [], error: null }),
  };
  return builder;
}

const RPC_ROWS = [
  {
    find_id: 'f1',
    user_id: 'u1',
    collection_id: 'c1',
    collection_item_id: 'i1',
    photo_url: 'https://x/1.jpg',
    location_lat: 52.23,
    location_lng: 21.01,
    notes: null,
    created_at: '2026-05-08T10:00:00Z',
    score: 9.5,
    shared_collections: 3,
    geo_score: 1.2,
    reactions_count: 4,
  },
  {
    find_id: 'f2',
    user_id: 'u2',
    collection_id: 'c1',
    collection_item_id: 'i2',
    photo_url: 'https://x/2.jpg',
    location_lat: null,
    location_lng: null,
    notes: 'nice',
    created_at: '2026-05-08T09:00:00Z',
    score: 7.0,
    shared_collections: 1,
    geo_score: 0,
    reactions_count: 0,
  },
];

const USERS = [
  { id: 'u1', display_name: 'Alice', username: 'alice', avatar_url: null },
  { id: 'u2', display_name: 'Bob', username: 'bob', avatar_url: 'https://x/b.jpg' },
];
const COLLECTIONS = [{ id: 'c1', title: 'Doors', icon: '🚪', category: 'urban' }];
const ITEMS = [
  { id: 'i1', name: 'Brass knob' },
  { id: 'i2', name: 'Iron handle' },
];

describe('listFeed', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockReset();
    mockFrom.mockImplementation((table: string) =>
      makeFromBuilder(table, {
        users: USERS,
        collections: COLLECTIONS,
        collection_items: ITEMS,
      })
    );
  });

  it('passes viewer location and pagination to the RPC with default page size 20', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    await listFeed({ viewerLat: 52.0, viewerLng: 21.0 });
    expect(mockRpc).toHaveBeenCalledWith('get_personalized_feed', {
      viewer_lat: 52.0,
      viewer_lng: 21.0,
      page_size: 20,
      page_offset: 0,
    });
  });

  it('overrides pageSize and pageOffset when provided', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    await listFeed({ viewerLat: null, viewerLng: null, pageSize: 50, pageOffset: 100 });
    expect(mockRpc).toHaveBeenCalledWith('get_personalized_feed', {
      viewer_lat: null,
      viewer_lng: null,
      page_size: 50,
      page_offset: 100,
    });
  });

  it('returns an empty list without firing join queries when the RPC is empty', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    const out = await listFeed({ viewerLat: null, viewerLng: null });
    expect(out).toEqual([]);
    // No joins should happen — saves three round-trips on an empty feed.
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('preserves RPC ordering when hydrating', async () => {
    mockRpc.mockResolvedValueOnce({ data: RPC_ROWS, error: null });
    const out = await listFeed({ viewerLat: 52.0, viewerLng: 21.0 });
    expect(out.map((f) => f.findId)).toEqual(['f1', 'f2']);
  });

  it('joins users, collections, and items in a single batched fan-out', async () => {
    mockRpc.mockResolvedValueOnce({ data: RPC_ROWS, error: null });
    await listFeed({ viewerLat: 52.0, viewerLng: 21.0 });
    const tables = mockFrom.mock.calls.map((c) => c[0]);
    expect(tables.sort()).toEqual(['collection_items', 'collections', 'users']);
  });

  it('hydrates all FeedItem fields from the joined rows', async () => {
    mockRpc.mockResolvedValueOnce({ data: RPC_ROWS, error: null });
    const out = await listFeed({ viewerLat: 52.0, viewerLng: 21.0 });
    expect(out[0]).toMatchObject({
      findId: 'f1',
      userId: 'u1',
      collectionId: 'c1',
      collectionItemId: 'i1',
      collectionTitle: 'Doors',
      collectionIcon: '🚪',
      collectionCategory: 'urban',
      itemName: 'Brass knob',
      photoUrl: 'https://x/1.jpg',
      locationLat: 52.23,
      locationLng: 21.01,
      creatorUsername: 'alice',
      creatorDisplayName: 'Alice',
      creatorAvatarUrl: null,
      score: 9.5,
      sharedCollections: 3,
      geoScore: 1.2,
      reactionsCount: 4,
    });
  });

  it('drops a row when its creator/collection/item is missing from the joins', async () => {
    // Race: a user / collection deleted between RPC and join. We prefer
    // dropping the row over rendering a card with empty fields.
    mockRpc.mockResolvedValueOnce({ data: RPC_ROWS, error: null });
    mockFrom.mockImplementation((table: string) =>
      makeFromBuilder(table, {
        users: [USERS[0]], // u2 gone
        collections: COLLECTIONS,
        collection_items: ITEMS,
      })
    );
    const out = await listFeed({ viewerLat: null, viewerLng: null });
    expect(out.map((f) => f.findId)).toEqual(['f1']);
  });

  it('throws when the RPC errors', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('rpc-down') });
    await expect(listFeed({ viewerLat: null, viewerLng: null })).rejects.toThrow('rpc-down');
  });

  it('throws when a join query errors', async () => {
    mockRpc.mockResolvedValueOnce({ data: RPC_ROWS, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            in: () => ({
              returns: () => ({
                then: (resolve: (v: { data: null; error: Error }) => unknown) =>
                  resolve({ data: null, error: new Error('users-down') }),
              }),
            }),
          }),
        };
      }
      return makeFromBuilder(table, {
        collections: COLLECTIONS,
        collection_items: ITEMS,
      });
    });
    await expect(listFeed({ viewerLat: null, viewerLng: null })).rejects.toThrow('users-down');
  });
});
