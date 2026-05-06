// Verifies that filter/sort/query inputs reach rpc_discover_collections with
// the parameter names the migration declares — a typo here would silently
// degrade Discover to "popular, no filter" instead of erroring.

/* eslint-disable import/first */
const mockRpc = jest.fn();

jest.mock('../supabase.service', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import { listDiscoverCollections } from '../discover.service';
/* eslint-enable import/first */

describe('listDiscoverCollections', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  it('passes named filter args through to the RPC', async () => {
    await listDiscoverCollections({
      category: 'nature',
      query: '  birds  ',
      sort: 'new',
      limit: 10,
      offset: 5,
    });
    expect(mockRpc).toHaveBeenCalledWith('rpc_discover_collections', {
      p_category: 'nature',
      p_query: 'birds',
      p_sort: 'new',
      p_limit: 10,
      p_offset: 5,
    });
  });

  it('treats empty query as null so the RPC skips the ilike branch', async () => {
    await listDiscoverCollections({ query: '   ' });
    expect(mockRpc).toHaveBeenCalledWith(
      'rpc_discover_collections',
      expect.objectContaining({ p_query: null, p_sort: 'popular' })
    );
  });

  it('coerces forks_count to number and maps category enum through', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'c1',
          title: 'Cats',
          description: null,
          icon: null,
          cover_image_url: null,
          category: 'animals',
          is_featured: true,
          creator_id: 'u1',
          created_at: '2026-05-05T00:00:00Z',
          forks_count: '42', // bigint comes back as string in some drivers
          items_count: 25,
          forked_by_me: false,
        },
      ],
      error: null,
    });
    const out = await listDiscoverCollections({});
    expect(out).toHaveLength(1);
    expect(out[0].forks_count).toBe(42);
    expect(out[0].category).toBe('animals');
  });

  it('throws on Supabase error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('boom') });
    await expect(listDiscoverCollections({})).rejects.toThrow('boom');
  });
});
