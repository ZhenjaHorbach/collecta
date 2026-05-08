// useGenerateCollection wraps the generator service and stores typed
// AiGenerationError instances. Tests pin: success populates draft,
// service AiGenerationError flows through, unknown errors are wrapped.

/* eslint-disable import/first */
const mockGenerate = jest.fn();

jest.mock('@services/ai-collection-generator.service', () => {
  // Re-export the service's AiGenerationError shape via mock so the hook's
  // `instanceof` check uses the mock class. Defined inside the factory to
  // avoid TDZ issues with jest.mock hoisting.
  class MockAiGenerationError extends Error {
    readonly code: string;
    readonly used?: number;
    readonly limit?: number;
    constructor(code: string, message?: string, meta?: { used?: number; limit?: number }) {
      super(message ?? code);
      this.code = code;
      this.used = meta?.used;
      this.limit = meta?.limit;
    }
  }
  return {
    AiGenerationError: MockAiGenerationError,
    generateCollection: (...args: unknown[]) => mockGenerate(...args),
  };
});

import { AiGenerationError as MockAiGenerationError } from '@services/ai-collection-generator.service';

import { act, renderHook } from '@testing-library/react-native';

import { useGenerateCollection } from '../useGenerateCollection';
/* eslint-enable import/first */

beforeEach(() => mockGenerate.mockReset());

describe('useGenerateCollection', () => {
  it('returns the draft on success', async () => {
    mockGenerate.mockResolvedValue({ title: 'Doors' });
    const { result } = renderHook(() => useGenerateCollection());
    let draft: unknown = null;
    await act(async () => {
      draft = await result.current.generate('Doors of Warsaw', 'en');
    });
    expect(draft).toEqual({ title: 'Doors' });
    expect(result.current.draft).toEqual({ title: 'Doors' });
    expect(result.current.error).toBeNull();
  });

  it('preserves AiGenerationError code/metadata', async () => {
    mockGenerate.mockRejectedValue(
      new MockAiGenerationError('rate_limited', 'too many', { used: 9, limit: 10 })
    );
    const { result } = renderHook(() => useGenerateCollection());
    let draft: unknown = 'sentinel';
    await act(async () => {
      draft = await result.current.generate('Doors of Warsaw', 'en');
    });
    expect(draft).toBeNull();
    expect(result.current.error?.code).toBe('rate_limited');
    expect(result.current.error?.used).toBe(9);
    expect(result.current.error?.limit).toBe(10);
  });

  it('wraps unknown errors as AiGenerationError(unknown)', async () => {
    mockGenerate.mockRejectedValue(new Error('???'));
    const { result } = renderHook(() => useGenerateCollection());
    await act(async () => {
      await result.current.generate('Doors of Warsaw', 'en');
    });
    expect(result.current.error?.code).toBe('unknown');
  });

  it('reset clears draft and error', async () => {
    mockGenerate.mockResolvedValue({ title: 'Doors' });
    const { result } = renderHook(() => useGenerateCollection());
    await act(async () => {
      await result.current.generate('Doors of Warsaw', 'en');
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.draft).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
