// Reports: shape of the row, error-code mapping (23505 = already reported,
// 42501 = unauthorized, anything else = network), and that comment
// concatenation is safe across whitespace.

/* eslint-disable import/first */
const mockState = {
  insertError: null as { code?: string; message?: string } | null,
  insertCalls: [] as unknown[],
};

jest.mock('../supabase.service', () => ({
  supabase: {
    from: () => ({
      insert: (row: unknown) => {
        mockState.insertCalls.push(row);
        return Promise.resolve({ data: null, error: mockState.insertError });
      },
    }),
  },
}));

import { ReportError, reportCollection, reportFind } from '../moderation.service';
/* eslint-enable import/first */

beforeEach(() => {
  mockState.insertError = null;
  mockState.insertCalls = [];
});

describe('reportCollection', () => {
  it('inserts a row keyed to target_type=collection with the bare reason', async () => {
    await reportCollection('me', 'c1', 'spam');
    expect(mockState.insertCalls).toEqual([
      { reporter_id: 'me', target_type: 'collection', target_id: 'c1', reason: 'spam' },
    ]);
  });

  it('appends a trimmed comment with a colon separator', async () => {
    await reportCollection('me', 'c1', 'other', '  some context  ');
    expect(mockState.insertCalls[0]).toMatchObject({
      reason: 'other: some context',
    });
  });

  it('falls back to the bare reason when the comment is whitespace-only', async () => {
    await reportCollection('me', 'c1', 'inappropriate', '   ');
    expect(mockState.insertCalls[0]).toMatchObject({ reason: 'inappropriate' });
  });
});

describe('reportFind', () => {
  it('uses target_type=find', async () => {
    await reportFind('me', 'f1', 'offTopic');
    expect(mockState.insertCalls[0]).toMatchObject({
      target_type: 'find',
      target_id: 'f1',
      reason: 'offTopic',
    });
  });
});

describe('error mapping', () => {
  it('maps 23505 to already_reported', async () => {
    mockState.insertError = { code: '23505', message: 'dup' };
    await expect(reportCollection('me', 'c1', 'spam')).rejects.toBeInstanceOf(ReportError);
    await expect(reportCollection('me', 'c1', 'spam')).rejects.toMatchObject({
      code: 'already_reported',
    });
  });

  it('maps 42501 to unauthorized', async () => {
    mockState.insertError = { code: '42501', message: 'rls' };
    await expect(reportFind('me', 'f1', 'spam')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('falls through to network for unknown errors', async () => {
    mockState.insertError = { code: '08006', message: 'connection lost' };
    await expect(reportFind('me', 'f1', 'spam')).rejects.toMatchObject({
      code: 'network',
    });
  });
});

describe('reason validation', () => {
  it('throws on an unknown reason before touching the DB', async () => {
    await expect(
      reportCollection('me', 'c1', 'totallyBogus' as unknown as 'spam')
    ).rejects.toThrow();
    expect(mockState.insertCalls).toHaveLength(0);
  });
});
