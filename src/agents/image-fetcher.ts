// Reference-image lookup for collection items.
//
// Two-stage waterfall, both stages are pure HTTP via global `fetch`:
//
//   1. Wikipedia pageimages — free, no key, very high quality for biology /
//      architecture / vehicles / cloud types / cat breeds. Returns the
//      page's primary infobox image directly.
//   2. Unsplash search   — needs UNSPLASH_ACCESS_KEY; covers lifestyle and
//      everything Wikipedia doesn't. Skipped when the key is absent so the
//      same module works in any environment.
//
// Self-contained (no SDK imports): runs under both Node (scripts) and Deno
// (edge function) via the same .ts file, mirroring the agents library.

const WIKI_ENDPOINT = 'https://en.wikipedia.org/w/api.php';
const UNSPLASH_ENDPOINT = 'https://api.unsplash.com/search/photos';

const USER_AGENT = 'collecta/1.0 (https://collecta.app; multi-agent-image-enrichment)';

// Read an env var from whichever runtime is hosting us. Node sets process.env;
// Deno exposes Deno.env.get. Both are optional — caller may also pass the
// value through `unsplashKey` directly.
function readEnv(name: string): string | undefined {
  const g = globalThis as {
    process?: { env?: Record<string, string | undefined> };
    Deno?: { env: { get: (k: string) => string | undefined } };
  };
  if (g.process?.env && typeof g.process.env[name] === 'string') {
    return g.process.env[name];
  }
  if (g.Deno && typeof g.Deno.env?.get === 'function') {
    return g.Deno.env.get(name);
  }
  return undefined;
}

// Wikipedia returns a generator-mapped object keyed by pageid; we just need
// the first hit's `original` URL. `gsrlimit=1` keeps the response trivial.
interface WikiPage {
  pageid?: number;
  title?: string;
  original?: { source?: string };
}

interface WikiResponse {
  query?: { pages?: Record<string, WikiPage> };
}

export async function fetchWikipediaImage(query: string): Promise<string | null> {
  const url = new URL(WIKI_ENDPOINT);
  url.searchParams.set('action', 'query');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', query);
  url.searchParams.set('gsrlimit', '1');
  url.searchParams.set('prop', 'pageimages');
  url.searchParams.set('piprop', 'original');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  let res: Response;
  try {
    res = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const data = (await res.json()) as WikiResponse;
  const pages = data.query?.pages ?? {};
  // Object.values order is insertion-order; with gsrlimit=1 there's only one.
  const page = Object.values(pages)[0];
  return page?.original?.source ?? null;
}

interface UnsplashPhoto {
  urls?: { regular?: string; small?: string };
}
interface UnsplashResponse {
  results?: UnsplashPhoto[];
}

export async function fetchUnsplashImage(query: string, accessKey: string): Promise<string | null> {
  const url = new URL(UNSPLASH_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '1');
  url.searchParams.set('orientation', 'landscape');

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const data = (await res.json()) as UnsplashResponse;
  return data.results?.[0]?.urls?.regular ?? null;
}

export interface FetchOptions {
  // Defaults to UNSPLASH_ACCESS_KEY env var. Pass an explicit key only when
  // the runtime can't see process.env (Deno edge in a tightly-scoped sandbox).
  unsplashKey?: string;
  // When true, skip Unsplash entirely. Used by the backfill script's
  // "wikipedia-only" mode.
  skipUnsplash?: boolean;
}

// Combined waterfall: Wikipedia first, Unsplash as fallback.
export async function fetchExampleImage(
  query: string,
  opts: FetchOptions = {}
): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const wiki = await fetchWikipediaImage(trimmed);
  if (wiki) return wiki;

  if (opts.skipUnsplash) return null;

  const key = opts.unsplashKey ?? readEnv('UNSPLASH_ACCESS_KEY');
  if (!key) return null;

  return await fetchUnsplashImage(trimmed, key);
}

// Bulk variant — runs lookups in parallel with a small concurrency cap so we
// don't blow Unsplash's 50/hour Demo limit on a 25-item collection.
export async function fetchExampleImagesForNames(
  names: readonly string[],
  opts: FetchOptions = {}
): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  const CHUNK = 4;
  for (let i = 0; i < names.length; i += CHUNK) {
    const slice = names.slice(i, i + CHUNK);
    const results = await Promise.all(slice.map((n) => fetchExampleImage(n, opts)));
    slice.forEach((n, idx) => {
      out[n] = results[idx];
    });
  }
  return out;
}
