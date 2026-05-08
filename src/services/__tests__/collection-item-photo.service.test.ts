// collection-item-photo: isOwnedCollectionItemPhoto is a cheap predicate
// callsites use to gate "delete on remove" — false positives there would
// 404 against external image hosts (Wikipedia / Unsplash from the AI
// pipeline). Pin the bucket-prefix logic.
//
// Upload + delete share their full mock surface with find-photo.service —
// see find-photo.service.test.ts for the exhaustive shape; this file does
// just enough to verify the bucket name is wired correctly.

/* eslint-disable import/first */
const mockUpload = jest.fn();
const mockRemove = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(async () => 'AAAA'),
}));

jest.mock('../supabase.service', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        remove: (...args: unknown[]) => mockRemove(...args),
        getPublicUrl: (key: string) => ({
          data: {
            publicUrl: `https://stub.supabase.co/storage/v1/object/public/collection-item-images/${key}`,
          },
        }),
      }),
    },
  },
}));

import {
  deleteCollectionItemPhoto,
  isOwnedCollectionItemPhoto,
  uploadCollectionItemPhoto,
} from '../collection-item-photo.service';
/* eslint-enable import/first */

describe('isOwnedCollectionItemPhoto', () => {
  it('returns true for URLs in our bucket', () => {
    expect(
      isOwnedCollectionItemPhoto(
        'https://stub.supabase.co/storage/v1/object/public/collection-item-images/u/k.jpg'
      )
    ).toBe(true);
  });

  it('returns false for AI pipeline (Wikipedia / Unsplash) URLs', () => {
    expect(
      isOwnedCollectionItemPhoto('https://upload.wikimedia.org/wikipedia/commons/door.jpg')
    ).toBe(false);
    expect(isOwnedCollectionItemPhoto('https://images.unsplash.com/photo-123')).toBe(false);
  });

  it('returns false for null/undefined/empty', () => {
    expect(isOwnedCollectionItemPhoto(null)).toBe(false);
    expect(isOwnedCollectionItemPhoto(undefined)).toBe(false);
    expect(isOwnedCollectionItemPhoto('')).toBe(false);
  });
});

describe('upload + delete', () => {
  beforeEach(() => {
    mockUpload.mockReset();
    mockRemove.mockReset();
    mockUpload.mockResolvedValue({ data: { path: 'ok' }, error: null });
    mockRemove.mockResolvedValue({ data: null, error: null });
  });

  it('uploads under collection-item-images bucket with userId namespace', async () => {
    const url = await uploadCollectionItemPhoto('file:///tmp/p.jpg', 'u-1');
    const [key, , opts] = mockUpload.mock.calls[0];
    expect((key as string).startsWith('u-1/')).toBe(true);
    expect(opts).toMatchObject({ contentType: 'image/jpeg', upsert: false });
    expect(url).toContain('/collection-item-images/u-1/');
  });

  it('delete is a no-op for URLs outside our bucket', async () => {
    await deleteCollectionItemPhoto('https://upload.wikimedia.org/photo.jpg');
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('delete extracts object key for our bucket and removes', async () => {
    await deleteCollectionItemPhoto(
      'https://stub.supabase.co/storage/v1/object/public/collection-item-images/u/k.jpg'
    );
    expect(mockRemove).toHaveBeenCalledWith(['u/k.jpg']);
  });
});
