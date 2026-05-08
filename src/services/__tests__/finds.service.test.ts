// finds.service: createFind upserts (one find per user+collection_item per
// migration 009), awardXp fires fire-and-forget, listFindsForMap drops rows
// that have no joined collection.

/* eslint-disable import/first */
type Row = Record<string, unknown>;

const mockState = {
  existing: null as Row | null,
  insertResult: null as Row | null,
  insertError: null as Error | null,
  updateResult: null as Row | null,
  updateError: null as Error | null,
  selectResult: null as Row | null,
  selectError: null as Error | null,
  mapRows: [] as Row[],
  mapError: null as Error | null,
  insertCalls: [] as unknown[],
  updateCalls: [] as unknown[],
};

jest.mock('../supabase.service', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: mockState.existing, error: null }),
          }),
          single: () =>
            Promise.resolve({ data: mockState.selectResult, error: mockState.selectError }),
        }),
        not: () => ({
          not: () => ({
            gte: () => ({
              lte: () => ({
                gte: () => ({
                  lte: () => ({
                    order: () => ({
                      limit: () => ({
                        returns: () =>
                          Promise.resolve({
                            data: mockState.mapRows,
                            error: mockState.mapError,
                          }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
      insert: (row: unknown) => {
        mockState.insertCalls.push(row);
        return {
          select: () => ({
            single: () =>
              Promise.resolve({
                data: mockState.insertResult,
                error: mockState.insertError,
              }),
          }),
        };
      },
      update: (row: unknown) => {
        mockState.updateCalls.push(row);
        return {
          eq: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: mockState.updateResult,
                  error: mockState.updateError,
                }),
            }),
          }),
        };
      },
    }),
  },
}));

const mockAwardXp = jest.fn();
jest.mock('../gamification.service', () => ({
  awardXp: (...args: unknown[]) => mockAwardXp(...args),
}));

const mockDeletePhoto = jest.fn();
jest.mock('../find-photo.service', () => ({
  deleteFindPhoto: (...args: unknown[]) => mockDeletePhoto(...args),
}));

import { createFind, getFindById, listFindsForMap } from '../finds.service';
/* eslint-enable import/first */

const VALID_FIND = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: '22222222-2222-2222-2222-222222222222',
  collection_item_id: '33333333-3333-3333-3333-333333333333',
  photo_url: 'https://x/p.jpg',
  ai_validated: null,
  ai_confidence: null,
  ai_notes: null,
  notes: null,
  location_lat: null,
  location_lng: null,
  created_at: '2026-05-08T10:00:00Z',
};

beforeEach(() => {
  mockState.existing = null;
  mockState.insertResult = null;
  mockState.insertError = null;
  mockState.updateResult = null;
  mockState.updateError = null;
  mockState.selectResult = null;
  mockState.selectError = null;
  mockState.mapRows = [];
  mockState.mapError = null;
  mockState.insertCalls = [];
  mockState.updateCalls = [];
  mockAwardXp.mockReset();
  mockDeletePhoto.mockReset();
  mockDeletePhoto.mockResolvedValue(undefined);
});

describe('createFind — insert path', () => {
  it('inserts a new find and fires awardXp("find") fire-and-forget', async () => {
    mockState.insertResult = VALID_FIND;
    const find = await createFind({
      userId: VALID_FIND.user_id,
      collectionItemId: VALID_FIND.collection_item_id,
      photoUrl: VALID_FIND.photo_url,
    });
    expect(find.id).toBe(VALID_FIND.id);
    expect(mockState.insertCalls).toHaveLength(1);
    expect(mockAwardXp).toHaveBeenCalledWith(VALID_FIND.user_id, 'find');
  });

  it('throws when the insert errors', async () => {
    mockState.insertError = new Error('rls');
    await expect(
      createFind({
        userId: VALID_FIND.user_id,
        collectionItemId: VALID_FIND.collection_item_id,
        photoUrl: VALID_FIND.photo_url,
      })
    ).rejects.toThrow('rls');
    expect(mockAwardXp).not.toHaveBeenCalled();
  });
});

describe('createFind — upsert (re-photo) path', () => {
  it('updates the existing row and fires awardXp("recheck"), not "find"', async () => {
    mockState.existing = { id: VALID_FIND.id, photo_url: 'https://old/p.jpg' };
    mockState.updateResult = VALID_FIND;
    await createFind({
      userId: VALID_FIND.user_id,
      collectionItemId: VALID_FIND.collection_item_id,
      photoUrl: VALID_FIND.photo_url,
    });
    expect(mockState.updateCalls).toHaveLength(1);
    expect(mockState.insertCalls).toHaveLength(0);
    expect(mockAwardXp).toHaveBeenCalledWith(VALID_FIND.user_id, 'recheck');
  });

  it('best-effort deletes the old photo when the URL changed', async () => {
    mockState.existing = { id: VALID_FIND.id, photo_url: 'https://old/p.jpg' };
    mockState.updateResult = VALID_FIND;
    await createFind({
      userId: VALID_FIND.user_id,
      collectionItemId: VALID_FIND.collection_item_id,
      photoUrl: VALID_FIND.photo_url,
    });
    // fire-and-forget — yield the microtask so the .catch() chain attaches
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockDeletePhoto).toHaveBeenCalledWith('https://old/p.jpg');
  });

  it('does not delete when the photo URL is unchanged', async () => {
    mockState.existing = { id: VALID_FIND.id, photo_url: VALID_FIND.photo_url };
    mockState.updateResult = VALID_FIND;
    await createFind({
      userId: VALID_FIND.user_id,
      collectionItemId: VALID_FIND.collection_item_id,
      photoUrl: VALID_FIND.photo_url,
    });
    expect(mockDeletePhoto).not.toHaveBeenCalled();
  });
});

describe('listFindsForMap', () => {
  it('drops rows that have no joined collection', async () => {
    mockState.mapRows = [
      {
        id: 'a',
        photo_url: 'https://x/a.jpg',
        location_lat: 1,
        location_lng: 2,
        created_at: 't',
        collection_items: {
          name: 'Door',
          collections: { id: 'c', title: 'C', icon: null, category: 'urban' },
        },
      },
      {
        id: 'b',
        photo_url: 'https://x/b.jpg',
        location_lat: 1,
        location_lng: 2,
        created_at: 't',
        collection_items: { name: 'Door', collections: null }, // dangling join
      },
    ];
    const out = await listFindsForMap({ minLat: 0, maxLat: 90, minLng: 0, maxLng: 90 });
    expect(out.map((f) => f.id)).toEqual(['a']);
  });

  it('throws on Supabase error', async () => {
    mockState.mapError = new Error('boom');
    await expect(listFindsForMap({ minLat: 0, maxLat: 90, minLng: 0, maxLng: 90 })).rejects.toThrow(
      'boom'
    );
  });
});

describe('getFindById', () => {
  it('throws find_not_found when row is missing', async () => {
    mockState.selectError = null;
    mockState.selectResult = null;
    await expect(getFindById('any')).rejects.toThrow('find_not_found');
  });

  it('throws find_not_found when joins are missing', async () => {
    mockState.selectResult = {
      ...VALID_FIND,
      users: null,
      collection_items: null,
    };
    await expect(getFindById('any')).rejects.toThrow('find_not_found');
  });
});
