// Pins the typed-error mapping for the generate-collection edge function.
// HTTP status → AiGenerationErrorCode is the contract the UI relies on to
// render the right message (rate-limited dialog vs network retry vs
// "prompt too short"); silent drift here means the wrong copy in front of
// the user.

/* eslint-disable import/first */
const mockInvoke = jest.fn();

jest.mock('../supabase.service', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

import { AiGenerationError, generateCollection } from '../ai-collection-generator.service';
/* eslint-enable import/first */

const MIN_VALID_DRAFT = {
  title: 'Doors of Warsaw',
  description: 'Unusual doors photographed in central Warsaw — a record of city texture.',
  category: 'urban',
  items: Array.from({ length: 5 }, (_, i) => ({
    name: `Door ${i + 1}`,
    description: 'A curious door with a long story behind it.',
    ai_hint: 'Look for ornate metalwork, faded paint, or unusual house numbers.',
    rarity: 'common',
    fun_fact: 'Behind it once lived a tailor who never closed his shop.',
  })),
};

describe('generateCollection — prompt validation', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('rejects a prompt under 3 chars without invoking the function', async () => {
    await expect(generateCollection('ab', 'en')).rejects.toBeInstanceOf(AiGenerationError);
    await expect(generateCollection('ab', 'en')).rejects.toMatchObject({
      code: 'prompt_too_short',
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('rejects a prompt over 500 chars without invoking the function', async () => {
    await expect(generateCollection('a'.repeat(501), 'en')).rejects.toMatchObject({
      code: 'prompt_too_long',
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('trims whitespace before length-checking', async () => {
    // 2 visible chars in a sea of whitespace → still too short.
    await expect(generateCollection('   ab   ', 'en')).rejects.toMatchObject({
      code: 'prompt_too_short',
    });
  });

  it('passes trimmed prompt and locale through to the edge function', async () => {
    mockInvoke.mockResolvedValue({ data: { draft: MIN_VALID_DRAFT }, error: null });
    await generateCollection('  Doors of Warsaw  ', 'pl');
    expect(mockInvoke).toHaveBeenCalledWith('generate-collection', {
      body: { prompt: 'Doors of Warsaw', locale: 'pl' },
    });
  });
});

describe('generateCollection — error mapping', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('maps 401 status to unauthorized', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('boom'), { context: { status: 401 } }),
    });
    await expect(generateCollection('Doors of Warsaw', 'en')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('maps 429 status to rate_limited and forwards used/limit metadata', async () => {
    mockInvoke.mockResolvedValue({
      data: { used: 9, limit: 10 },
      error: Object.assign(new Error('rate'), { context: { status: 429 } }),
    });
    try {
      await generateCollection('Doors of Warsaw', 'en');
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AiGenerationError);
      expect((e as AiGenerationError).code).toBe('rate_limited');
      expect((e as AiGenerationError).used).toBe(9);
      expect((e as AiGenerationError).limit).toBe(10);
    }
  });

  it('maps 502 status to invalid_output', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('upstream'), { context: { status: 502 } }),
    });
    await expect(generateCollection('Doors of Warsaw', 'en')).rejects.toMatchObject({
      code: 'invalid_output',
    });
  });

  it('falls through to network for unknown statuses', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('???'), { context: { status: 503 } }),
    });
    await expect(generateCollection('Doors of Warsaw', 'en')).rejects.toMatchObject({
      code: 'network',
    });
  });

  it('returns invalid_output when the body has no draft', async () => {
    mockInvoke.mockResolvedValue({ data: { error: 'parse failed' }, error: null });
    await expect(generateCollection('Doors of Warsaw', 'en')).rejects.toMatchObject({
      code: 'invalid_output',
    });
  });

  it('returns invalid_output when the draft fails Zod parse', async () => {
    mockInvoke.mockResolvedValue({
      data: { draft: { title: 'X', description: 'Y', category: 'urban', items: [] } }, // <5 items
      error: null,
    });
    await expect(generateCollection('Doors of Warsaw', 'en')).rejects.toMatchObject({
      code: 'invalid_output',
    });
  });
});

describe('generateCollection — happy path', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('returns a parsed AiDraft when the function succeeds', async () => {
    mockInvoke.mockResolvedValue({ data: { draft: MIN_VALID_DRAFT }, error: null });
    const out = await generateCollection('Doors of Warsaw', 'en');
    expect(out.title).toBe('Doors of Warsaw');
    expect(out.items).toHaveLength(5);
  });
});
