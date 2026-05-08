// useCapture: end-to-end capture flow (compress → upload → validate →
// commit). The biggest hook in the codebase. Tests pin the state-machine
// happy path, the AI-off shortcut from settings, the verify-mode commit,
// and the discard cleanup.

/* eslint-disable import/first */
const mockCompress = jest.fn();
const mockUpload = jest.fn();
const mockValidate = jest.fn();
const mockCreateFind = jest.fn();
const mockDeletePhoto = jest.fn();
const mockReadSetting = jest.fn();

jest.mock('collecta-turbo-image', () => ({
  compressImage: (...args: unknown[]) => mockCompress(...args),
}));
jest.mock('@services/find-photo.service', () => ({
  uploadFindPhoto: (...args: unknown[]) => mockUpload(...args),
  deleteFindPhoto: (...args: unknown[]) => mockDeletePhoto(...args),
}));
jest.mock('@services/ai-validation.service', () => ({
  validateFind: (...args: unknown[]) => mockValidate(...args),
}));
jest.mock('@services/finds.service', () => ({
  createFind: (...args: unknown[]) => mockCreateFind(...args),
}));
jest.mock('../useSetting', () => ({
  readSetting: (...args: unknown[]) => mockReadSetting(...args),
}));

import { act, renderHook } from '@testing-library/react-native';

import { useCapture } from '../useCapture';
/* eslint-enable import/first */

beforeEach(() => {
  mockCompress.mockReset();
  mockUpload.mockReset();
  mockValidate.mockReset();
  mockCreateFind.mockReset();
  mockDeletePhoto.mockReset();
  mockReadSetting.mockReset();
  mockCompress.mockResolvedValue({ uri: 'file:///compressed.jpg' });
  mockUpload.mockResolvedValue('https://stub/finds/u/k.jpg');
  mockReadSetting.mockReturnValue(false); // highResUploads + aiVerification default off in tests
  mockDeletePhoto.mockResolvedValue(undefined);
});

describe('useCapture', () => {
  it('starts at stage=idle', () => {
    const { result } = renderHook(() => useCapture());
    expect(result.current.stage).toBe('idle');
    expect(result.current.pending).toBeNull();
  });

  it('compress → upload → validate → done with verify-mode result', async () => {
    mockReadSetting.mockImplementation((name: string) => {
      if (name === 'aiVerification') return true;
      return false;
    });
    mockValidate.mockResolvedValue({
      status: 'ok',
      result: { valid: true, confidence: 0.9, detected: 'Door', suggestion: 'ok' },
      mode: 'verify',
      matchedCollectionId: null,
      matchedItemId: 'i1',
      candidateItems: [],
      candidateCollections: [],
      usage: null,
      model: 'claude-haiku-4-5',
      error: null,
    });
    const { result } = renderHook(() => useCapture());
    await act(async () => {
      await result.current.capture({
        rawPhotoUri: 'file:///raw.jpg',
        userId: 'u',
        collectionItemId: 'i1',
      });
    });
    expect(result.current.stage).toBe('done');
    expect(result.current.validation?.valid).toBe(true);
    expect(result.current.pending?.photoUrl).toBe('https://stub/finds/u/k.jpg');
    expect(mockUpload).toHaveBeenCalledWith('file:///compressed.jpg', 'u');
  });

  it('skips validateFind when aiVerification is OFF (synthesises a passed outcome)', async () => {
    mockReadSetting.mockImplementation((name: string) => {
      if (name === 'aiVerification') return false; // OFF
      return false;
    });
    const { result } = renderHook(() => useCapture());
    await act(async () => {
      await result.current.capture({
        rawPhotoUri: 'file:///raw.jpg',
        userId: 'u',
        collectionItemId: 'i1',
      });
    });
    expect(mockValidate).not.toHaveBeenCalled();
    expect(result.current.stage).toBe('done');
    expect(result.current.validation).toBeNull(); // synth, no real Vision result
    expect(result.current.matchedItemId).toBe('i1');
  });

  it('lands on stage=error when compress fails', async () => {
    mockCompress.mockRejectedValueOnce(new Error('compress crash'));
    const { result } = renderHook(() => useCapture());
    await act(async () => {
      await result.current.capture({
        rawPhotoUri: 'file:///raw.jpg',
        userId: 'u',
        collectionItemId: 'i1',
      });
    });
    expect(result.current.stage).toBe('error');
    expect(result.current.error).toMatch(/compressing/);
  });

  it('commit() routes pending into createFind and resets state', async () => {
    mockReadSetting.mockReturnValue(false); // aiVerification OFF
    mockCreateFind.mockResolvedValue({ id: 'find-id' });
    const { result } = renderHook(() => useCapture());
    await act(async () => {
      await result.current.capture({
        rawPhotoUri: 'file:///raw.jpg',
        userId: 'u',
        collectionItemId: 'i1',
      });
    });
    await act(async () => {
      await result.current.commit({ userId: 'u' });
    });
    expect(mockCreateFind).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u',
        collectionItemId: 'i1',
        photoUrl: 'https://stub/finds/u/k.jpg',
      })
    );
    expect(result.current.stage).toBe('idle');
    expect(result.current.pending).toBeNull();
  });

  it('commit() throws when nothing is pending', async () => {
    const { result } = renderHook(() => useCapture());
    await expect(result.current.commit({ userId: 'u' })).rejects.toThrow(/Nothing to commit/);
  });

  it('discard() deletes the uploaded photo and resets state', async () => {
    mockReadSetting.mockReturnValue(false);
    const { result } = renderHook(() => useCapture());
    await act(async () => {
      await result.current.capture({
        rawPhotoUri: 'file:///raw.jpg',
        userId: 'u',
        collectionItemId: 'i1',
      });
    });
    await act(async () => {
      await result.current.discard();
    });
    expect(mockDeletePhoto).toHaveBeenCalledWith('https://stub/finds/u/k.jpg');
    expect(result.current.stage).toBe('idle');
  });
});
