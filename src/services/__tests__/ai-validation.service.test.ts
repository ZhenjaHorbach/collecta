// validate-find call shape, status mapping, and the candidates clamping
// (confidence is always [0, 1]). Vision suite covers semantic correctness;
// this file pins the I/O shape of the client wrapper.

/* eslint-disable import/first */
const mockInvoke = jest.fn();
jest.mock('../supabase.service', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

import { validateFind } from '../ai-validation.service';
/* eslint-enable import/first */

const VALID_RESULT = {
  valid: true,
  confidence: 0.92,
  detected: 'A wooden door with brass numerals',
  suggestion: 'Looks good',
};

beforeEach(() => mockInvoke.mockReset());

describe('validateFind — body shape', () => {
  it('forwards photo_url, collection_item_id, and explicit mode', async () => {
    mockInvoke.mockResolvedValue({ data: { result: VALID_RESULT }, error: null });
    await validateFind({
      photoUrl: 'https://x/p.jpg',
      collectionItemId: 'item-1',
      mode: 'verify',
    });
    expect(mockInvoke).toHaveBeenCalledWith('validate-find', {
      body: {
        photo_url: 'https://x/p.jpg',
        collection_item_id: 'item-1',
        mode: 'verify',
      },
    });
  });

  it('omits empty optional fields', async () => {
    mockInvoke.mockResolvedValue({ data: { result: VALID_RESULT }, error: null });
    await validateFind({ photoUrl: 'https://x/p.jpg' });
    expect(mockInvoke).toHaveBeenCalledWith('validate-find', {
      body: { photo_url: 'https://x/p.jpg' },
    });
  });
});

describe('validateFind — outcome mapping', () => {
  it('returns invoke_failed when the function call itself errors', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('boom') });
    const out = await validateFind({ photoUrl: 'https://x/p.jpg' });
    expect(out.status).toBe('invoke_failed');
    expect(out.error).toBe('boom');
    expect(out.result).toBeNull();
  });

  it('returns vision_failed when the function returns an error body', async () => {
    mockInvoke.mockResolvedValue({ data: { error: 'mode_not_implemented' }, error: null });
    const out = await validateFind({ photoUrl: 'https://x/p.jpg' });
    expect(out.status).toBe('vision_failed');
    expect(out.error).toBe('mode_not_implemented');
  });

  it('returns vision_failed when the result is malformed', async () => {
    mockInvoke.mockResolvedValue({
      data: { result: { valid: 'yes', confidence: 'high' } },
      error: null,
    });
    const out = await validateFind({ photoUrl: 'https://x/p.jpg' });
    expect(out.status).toBe('vision_failed');
    expect(out.error).toBe('malformed_validation_result');
  });

  it('returns ok with parsed result and metadata', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        result: VALID_RESULT,
        mode: 'verify',
        matched_collection_id: 'c1',
        matched_item_id: 'i1',
        candidate_items: [{ id: 'i1', name: 'Door', confidence: 0.8 }],
        candidate_collections: [],
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
        },
        model: 'claude-haiku-4-5',
      },
      error: null,
    });
    const out = await validateFind({ photoUrl: 'https://x/p.jpg' });
    expect(out.status).toBe('ok');
    expect(out.result?.valid).toBe(true);
    expect(out.mode).toBe('verify');
    expect(out.matchedCollectionId).toBe('c1');
    expect(out.candidateItems).toHaveLength(1);
    expect(out.usage?.inputTokens).toBe(100);
    expect(out.model).toBe('claude-haiku-4-5');
  });

  it('clamps candidate confidence to [0, 1]', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        result: VALID_RESULT,
        candidate_items: [
          { id: 'i1', name: 'Door', confidence: 1.4 }, // garbage from upstream
          { id: 'i2', name: 'Window', confidence: -0.1 },
          { id: 'i3', name: 'Skip', confidence: 'oops' }, // dropped, not clamped
        ],
      },
      error: null,
    });
    const out = await validateFind({ photoUrl: 'https://x/p.jpg' });
    expect(out.candidateItems).toHaveLength(2);
    expect(out.candidateItems[0].confidence).toBe(1);
    expect(out.candidateItems[1].confidence).toBe(0);
  });

  it('rejects unknown mode strings', async () => {
    mockInvoke.mockResolvedValue({
      data: { result: VALID_RESULT, mode: 'something-else' },
      error: null,
    });
    const out = await validateFind({ photoUrl: 'https://x/p.jpg' });
    expect(out.mode).toBeNull();
  });
});
