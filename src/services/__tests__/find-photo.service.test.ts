// find-photo.service uploads finds to Supabase storage. Tests pin the
// generated object key shape (`<userId>/<ts>-<rand>.<ext>`), the extension
// inference, and the public-URL → object-key recovery used by deleteFindPhoto.

/* eslint-disable import/first */
const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockReadAsStringAsync = jest.fn();
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
}));

jest.mock('../supabase.service', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        remove: (...args: unknown[]) => mockRemove(...args),
        getPublicUrl: (key: string) => ({
          data: {
            publicUrl: `https://stub.supabase.co/storage/v1/object/public/finds-photos/${key}`,
          },
        }),
      }),
    },
  },
}));

import { deleteFindPhoto, uploadFindPhoto } from '../find-photo.service';
/* eslint-enable import/first */

beforeEach(() => {
  mockUpload.mockReset();
  mockRemove.mockReset();
  mockReadAsStringAsync.mockReset();
  // empty base64 — content doesn't matter, only that decode runs
  mockReadAsStringAsync.mockResolvedValue('AAAA');
  mockUpload.mockResolvedValue({ data: { path: 'ok' }, error: null });
  mockRemove.mockResolvedValue({ data: null, error: null });
  mockPlatformState.OS = 'ios';
});

describe('uploadFindPhoto', () => {
  it('chooses jpg by default and namespaces the key under userId/', async () => {
    const url = await uploadFindPhoto('file:///tmp/photo.jpg', 'user-1');
    const [key, , opts] = mockUpload.mock.calls[0];
    expect((key as string).startsWith('user-1/')).toBe(true);
    expect((key as string).endsWith('.jpg')).toBe(true);
    expect(opts).toMatchObject({ contentType: 'image/jpeg', upsert: false });
    expect(url).toContain('/finds-photos/user-1/');
  });

  it('uses .png when the source extension is png (case-insensitive)', async () => {
    await uploadFindPhoto('file:///tmp/photo.PNG', 'user-2');
    const [key, , opts] = mockUpload.mock.calls[0];
    expect((key as string).endsWith('.png')).toBe(true);
    expect(opts).toMatchObject({ contentType: 'image/png' });
  });

  it('throws when the upload fails', async () => {
    mockUpload.mockResolvedValueOnce({ data: null, error: new Error('quota') });
    await expect(uploadFindPhoto('file:///tmp/photo.jpg', 'u')).rejects.toThrow('quota');
  });

  it('reads bytes via fetch on web (FileSystem.readAsStringAsync is unavailable)', async () => {
    mockPlatformState.OS = 'web';
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = jest.fn(async () => ({ arrayBuffer: async () => buffer }));
    const original = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      await uploadFindPhoto('blob:https://example.com/abc-123', 'user-web');
    } finally {
      globalThis.fetch = original;
    }
    expect(fetchMock).toHaveBeenCalledWith('blob:https://example.com/abc-123');
    expect(mockReadAsStringAsync).not.toHaveBeenCalled();
    const [, body] = mockUpload.mock.calls[0];
    expect(body).toBeInstanceOf(Uint8Array);
    expect((body as Uint8Array).length).toBe(3);
  });
});

describe('deleteFindPhoto', () => {
  it('extracts the object key from a public URL and removes it', async () => {
    await deleteFindPhoto(
      'https://stub.supabase.co/storage/v1/object/public/finds-photos/user-1/123-abc.jpg'
    );
    expect(mockRemove).toHaveBeenCalledWith(['user-1/123-abc.jpg']);
  });

  it('silently returns when the URL does not match the bucket prefix', async () => {
    await deleteFindPhoto('https://elsewhere.example/some/path.jpg');
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('throws when the underlying remove call errors', async () => {
    mockRemove.mockResolvedValueOnce({ data: null, error: new Error('rls') });
    await expect(
      deleteFindPhoto('https://stub.supabase.co/storage/v1/object/public/finds-photos/u/k.jpg')
    ).rejects.toThrow('rls');
  });
});
