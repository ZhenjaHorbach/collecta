// image-mirror: `toThumbUrl` (sync, Unsplash only) and `resolveThumbUrl`
// (async, routes Wikimedia through the MediaWiki API) pick the URL we
// actually download. Pin the rewrites so a future refactor can't regress
// to fetching 5–10 MB originals.
//
// Wikimedia branch lives in resolveThumbUrl because `upload.wikimedia.org`
// only honours widths it has pre-cached (HTTP 400 otherwise per the 2024
// policy) — the MediaWiki API mints fresh sizes on demand.

import { isMirroredUrl, resolveThumbUrl, toThumbUrl } from '../image-mirror';

describe('toThumbUrl', () => {
  it('forces width + quality + jpg on Unsplash URLs', () => {
    const out = toThumbUrl('https://images.unsplash.com/photo-abc?ixlib=rb-1&ixid=Y');
    expect(out).toContain('w=1024');
    expect(out).toContain('q=75');
    expect(out).toContain('fm=jpg');
    // Pre-existing tracking params survive.
    expect(out).toContain('ixlib=rb-1');
    expect(out).toContain('ixid=Y');
  });

  it('passes Wikimedia URLs through unchanged (handled async via API)', () => {
    const src = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Foo.jpg';
    expect(toThumbUrl(src)).toBe(src);
  });

  it('passes through unknown hosts unchanged', () => {
    const src = 'https://example.com/some/photo.jpg';
    expect(toThumbUrl(src)).toBe(src);
  });
});

describe('resolveThumbUrl', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('resolves a Wikimedia URL via the MediaWiki API and returns thumburl', async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      expect(url).toContain('commons.wikimedia.org/w/api.php');
      expect(url).toContain('titles=File%3AFoo.jpg');
      expect(url).toContain('iiurlwidth=1024');
      return new Response(
        JSON.stringify({
          query: {
            pages: {
              '123': {
                imageinfo: [{ thumburl: 'https://upload.wikimedia.org/wiki/thumb/x/1024.jpg' }],
              },
            },
          },
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const out = await resolveThumbUrl(
      'https://upload.wikimedia.org/wikipedia/commons/9/9c/Foo.jpg'
    );
    expect(out).toBe('https://upload.wikimedia.org/wiki/thumb/x/1024.jpg');
  });

  it('falls back to the source URL when the API call fails', async () => {
    global.fetch = jest.fn(async () => new Response('boom', { status: 500 })) as typeof fetch;
    const src = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Foo.jpg';
    expect(await resolveThumbUrl(src)).toBe(src);
  });

  it('decodes percent-encoded filenames before sending them to the API', async () => {
    const seen: string[] = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      seen.push(typeof input === 'string' ? input : input.toString());
      return new Response(
        JSON.stringify({
          query: { pages: { '1': { imageinfo: [{ thumburl: 'https://x/thumb.jpg' }] } } },
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    await resolveThumbUrl(
      'https://upload.wikimedia.org/wikipedia/commons/3/3b/Library_Garden_Warsaw.JPG'
    );
    // The API takes the unencoded file title; the URL-encoded form was
    // re-encoded once by URLSearchParams (so : → %3A) but the underlying
    // value is the decoded filename.
    expect(seen[0]).toContain('Library_Garden_Warsaw.JPG');
  });

  it('uses sync rewrite for non-Wikimedia hosts', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
    const out = await resolveThumbUrl('https://images.unsplash.com/photo-abc');
    expect(out).toContain('w=1024');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('isMirroredUrl', () => {
  it('detects our bucket', () => {
    expect(
      isMirroredUrl(
        'https://stub.supabase.co/storage/v1/object/public/collection-item-images/abc/def.jpg'
      )
    ).toBe(true);
  });

  it('returns false for upstream hosts', () => {
    expect(isMirroredUrl('https://upload.wikimedia.org/wikipedia/commons/9/9c/Foo.jpg')).toBe(
      false
    );
  });
});
