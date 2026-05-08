// Reactions service: aggregate counts + viewer's own reactions, idempotent
// add (unique-constraint conflict swallowed), and toggle. Side-effect into
// award-xp must be fire-and-forget (never awaited, never blocks).

/* eslint-disable import/first */
const mockSupabase = {
  rows: [] as { id: string; user_id: string; find_id: string; type: string; created_at: string }[],
  insertError: null as { code?: string; message?: string } | null,
  deleteError: null as Error | null,
  insertCalls: [] as unknown[],
  deleteCalls: [] as unknown[],
};

jest.mock('../supabase.service', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: mockSupabase.rows, error: null }),
        in: () => Promise.resolve({ data: mockSupabase.rows, error: null }),
      }),
      insert: (row: unknown) => {
        mockSupabase.insertCalls.push(row);
        return Promise.resolve({
          data: null,
          error: mockSupabase.insertError,
        });
      },
      delete: () => ({
        eq: () => ({
          eq: () => ({
            eq: (...args: unknown[]) => {
              mockSupabase.deleteCalls.push(args);
              return Promise.resolve({ data: null, error: mockSupabase.deleteError });
            },
          }),
        }),
      }),
    }),
  },
}));

const mockAwardXp = jest.fn();
jest.mock('../gamification.service', () => ({
  awardXp: (...args: unknown[]) => mockAwardXp(...args),
}));

import {
  REACTION_TYPES,
  addReaction,
  aggregateReactionsForFind,
  batchAggregateReactions,
  removeReaction,
  toggleReaction,
} from '../reactions.service';
/* eslint-enable import/first */

beforeEach(() => {
  mockSupabase.rows = [];
  mockSupabase.insertError = null;
  mockSupabase.deleteError = null;
  mockSupabase.insertCalls = [];
  mockSupabase.deleteCalls = [];
  mockAwardXp.mockReset();
});

describe('REACTION_TYPES', () => {
  it('exposes the canonical type set', () => {
    expect(REACTION_TYPES).toEqual(['like', 'fire', 'wow']);
  });
});

describe('aggregateReactionsForFind', () => {
  it('returns zeroed counts when there are no reactions', async () => {
    const agg = await aggregateReactionsForFind('f1', 'me');
    expect(agg.counts).toEqual({ like: 0, fire: 0, wow: 0 });
    expect(agg.mine).toEqual([]);
  });

  it("counts reactions by type and flags the viewer's own", async () => {
    mockSupabase.rows = [
      { id: 'r1', user_id: 'me', find_id: 'f1', type: 'like', created_at: 't' },
      { id: 'r2', user_id: 'other', find_id: 'f1', type: 'like', created_at: 't' },
      { id: 'r3', user_id: 'me', find_id: 'f1', type: 'fire', created_at: 't' },
      { id: 'r4', user_id: 'other', find_id: 'f1', type: 'wow', created_at: 't' },
    ];
    const agg = await aggregateReactionsForFind('f1', 'me');
    expect(agg.counts).toEqual({ like: 2, fire: 1, wow: 1 });
    expect(agg.mine.sort()).toEqual(['fire', 'like']);
  });

  it('produces an empty mine[] when viewer is null', async () => {
    mockSupabase.rows = [{ id: 'r1', user_id: 'me', find_id: 'f1', type: 'like', created_at: 't' }];
    const agg = await aggregateReactionsForFind('f1', null);
    expect(agg.mine).toEqual([]);
  });
});

describe('batchAggregateReactions', () => {
  it('short-circuits on an empty find list (avoids the round-trip)', async () => {
    const map = await batchAggregateReactions([], 'me');
    expect(map.size).toBe(0);
  });

  it('initialises every requested find with a zero aggregate', async () => {
    mockSupabase.rows = [];
    const map = await batchAggregateReactions(['f1', 'f2'], 'me');
    expect(map.get('f1')?.counts).toEqual({ like: 0, fire: 0, wow: 0 });
    expect(map.get('f2')?.counts).toEqual({ like: 0, fire: 0, wow: 0 });
  });

  it('folds rows into the right find bucket', async () => {
    mockSupabase.rows = [
      { id: 'r1', user_id: 'me', find_id: 'f1', type: 'like', created_at: 't' },
      { id: 'r2', user_id: 'other', find_id: 'f2', type: 'fire', created_at: 't' },
      { id: 'r3', user_id: 'me', find_id: 'f2', type: 'wow', created_at: 't' },
    ];
    const map = await batchAggregateReactions(['f1', 'f2'], 'me');
    expect(map.get('f1')?.counts.like).toBe(1);
    expect(map.get('f2')?.counts.fire).toBe(1);
    expect(map.get('f2')?.counts.wow).toBe(1);
    expect(map.get('f2')?.mine).toEqual(['wow']);
  });
});

describe('addReaction', () => {
  it('inserts and fires-and-forgets awardXp on first reaction', async () => {
    await addReaction('me', 'f1', 'like');
    expect(mockSupabase.insertCalls).toEqual([{ user_id: 'me', find_id: 'f1', type: 'like' }]);
    expect(mockAwardXp).toHaveBeenCalledWith('me', 'reaction');
  });

  it('treats unique-constraint conflict (already reacted) as success', async () => {
    mockSupabase.insertError = { code: '23505', message: 'duplicate' };
    await expect(addReaction('me', 'f1', 'like')).resolves.toBeUndefined();
    // No double XP for the same reaction.
    expect(mockAwardXp).not.toHaveBeenCalled();
  });

  it('rethrows non-conflict errors', async () => {
    mockSupabase.insertError = { code: '42501', message: 'rls' };
    await expect(addReaction('me', 'f1', 'like')).rejects.toMatchObject({ code: '42501' });
  });
});

describe('removeReaction', () => {
  it('deletes the row scoped to (user, find, type)', async () => {
    await removeReaction('me', 'f1', 'fire');
    expect(mockSupabase.deleteCalls).toEqual([['type', 'fire']]);
  });

  it('rethrows on delete error', async () => {
    mockSupabase.deleteError = new Error('boom');
    await expect(removeReaction('me', 'f1', 'fire')).rejects.toThrow('boom');
  });
});

describe('toggleReaction', () => {
  it('removes when the user already has the reaction', async () => {
    const out = await toggleReaction('me', 'f1', 'like', true);
    expect(out).toBe('removed');
    expect(mockSupabase.insertCalls).toEqual([]);
  });

  it('adds when the user does not have the reaction', async () => {
    const out = await toggleReaction('me', 'f1', 'wow', false);
    expect(out).toBe('added');
    expect(mockSupabase.insertCalls).toHaveLength(1);
  });
});
