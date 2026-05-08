// find-photo.service uploads finds to Supabase storage. Tests pin the
// generated object key shape (`<userId>/<ts>-<rand>.<ext>`), the extension
// inference, and the public-URL → object-key recovery used by deleteFindPhoto.

/* eslint-disable import/first */
const mockUpload = jest.fn();
const mockRemove = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(
    async () =>
      // empty PNG-ish base64 — content doesn't matter, only that decode runs
      'AAAA'
  ),
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
  mockUpload.mockResolvedValue({ data: { path: 'ok' }, error: null });
  mockRemove.mockResolvedValue({ data: null, error: null });
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
