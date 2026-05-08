// useReport: dispatches to reportCollection / reportFind based on target,
// auth-gates, surfaces ReportError typed instances.

/* eslint-disable import/first */
const mockReportCollection = jest.fn();
const mockReportFind = jest.fn();

jest.mock('@services/moderation.service', () => {
  // Class declared inside the factory so it isn't TDZ-orphaned by hoisting.
  class MockReportError extends Error {
    readonly code: string;
    constructor(code: string, message?: string) {
      super(message ?? code);
      this.code = code;
    }
  }
  return {
    ReportError: MockReportError,
    reportCollection: (...args: unknown[]) => mockReportCollection(...args),
    reportFind: (...args: unknown[]) => mockReportFind(...args),
  };
});

import { ReportError as MockReportError } from '@services/moderation.service';

const mockUseAuth = jest.fn();
jest.mock('@hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

import { act, renderHook } from '@testing-library/react-native';

import { useReport } from '../useReport';
/* eslint-enable import/first */

beforeEach(() => {
  mockReportCollection.mockReset();
  mockReportFind.mockReset();
  mockUseAuth.mockReset();
});

describe('useReport', () => {
  it('returns unauthorized when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useReport());
    const out: { err: { code: string } | null } = { err: null };
    await act(async () => {
      out.err = await result.current.submit({
        target: 'collection',
        targetId: 'c',
        reason: 'spam',
      });
    });
    expect(out.err?.code).toBe('unauthorized');
    expect(result.current.error?.code).toBe('unauthorized');
  });

  it('routes target=collection to reportCollection', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockReportCollection.mockResolvedValue(undefined);
    const { result } = renderHook(() => useReport());
    await act(async () => {
      await result.current.submit({ target: 'collection', targetId: 'c', reason: 'spam' });
    });
    expect(mockReportCollection).toHaveBeenCalledWith('u', 'c', 'spam', undefined);
    expect(result.current.succeeded).toBe(true);
  });

  it('routes target=find to reportFind', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockReportFind.mockResolvedValue(undefined);
    const { result } = renderHook(() => useReport());
    await act(async () => {
      await result.current.submit({
        target: 'find',
        targetId: 'f',
        reason: 'spam',
        comment: ' note ',
      });
    });
    expect(mockReportFind).toHaveBeenCalledWith('u', 'f', 'spam', ' note ');
  });

  it('surfaces ReportError instances', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' } });
    mockReportCollection.mockRejectedValue(new MockReportError('already_reported'));
    const { result } = renderHook(() => useReport());
    await act(async () => {
      await result.current.submit({ target: 'collection', targetId: 'c', reason: 'spam' });
    });
    expect(result.current.error?.code).toBe('already_reported');
  });
});
