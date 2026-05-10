// files.utils: cross-platform photo IO. Pin both branches so swapping in
// FileSystem on web (or fetch on native) regresses loudly.

/* eslint-disable import/first */
const mockReadAsStringAsync = jest.fn();
const mockCopyAsync = jest.fn();
const mockPlatformState = { OS: 'ios' as 'ios' | 'android' | 'web' };

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatformState.OS;
    },
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: (...args: unknown[]) => mockReadAsStringAsync(...args),
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  documentDirectory: 'file:///docs/',
}));

import { persistTempPhoto, readBytes } from '../files.utils';
/* eslint-enable import/first */

beforeEach(() => {
  mockReadAsStringAsync.mockReset();
  mockCopyAsync.mockReset();
  mockPlatformState.OS = 'ios';
});

describe('readBytes', () => {
  it('reads via FileSystem.readAsStringAsync + base64 decode on native', async () => {
    mockReadAsStringAsync.mockResolvedValue('AAAA'); // base64 → 3 bytes
    const bytes = await readBytes('file:///tmp/photo.jpg');
    expect(mockReadAsStringAsync).toHaveBeenCalledWith('file:///tmp/photo.jpg', {
      encoding: 'base64',
    });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(3);
  });

  it('fetches the blob URL on web and skips FileSystem', async () => {
    mockPlatformState.OS = 'web';
    const buffer = new Uint8Array([7, 8, 9]).buffer;
    const fetchMock = jest.fn(async () => ({ arrayBuffer: async () => buffer }));
    const original = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const bytes = await readBytes('blob:https://x/abc');
      expect(fetchMock).toHaveBeenCalledWith('blob:https://x/abc');
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(Array.from(bytes)).toEqual([7, 8, 9]);
    } finally {
      globalThis.fetch = original;
    }
    expect(mockReadAsStringAsync).not.toHaveBeenCalled();
  });
});

describe('persistTempPhoto', () => {
  it('copies to documentDirectory on native and returns the new path', async () => {
    mockCopyAsync.mockResolvedValue(undefined);
    const out = await persistTempPhoto('file:///tmp/source.jpg');
    expect(mockCopyAsync).toHaveBeenCalledTimes(1);
    const args = mockCopyAsync.mock.calls[0][0] as { from: string; to: string };
    expect(args.from).toBe('file:///tmp/source.jpg');
    expect(args.to.startsWith('file:///docs/photo_')).toBe(true);
    expect(args.to.endsWith('.jpg')).toBe(true);
    expect(out).toBe(args.to);
  });

  it('returns the URI as-is on web (no FileSystem call)', async () => {
    mockPlatformState.OS = 'web';
    const out = await persistTempPhoto('blob:https://x/abc');
    expect(out).toBe('blob:https://x/abc');
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });
});
