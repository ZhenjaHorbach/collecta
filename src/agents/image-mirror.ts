// Mirror external reference images (Wikipedia / Unsplash) into our Supabase
// Storage bucket so the client never hits a rate-limited third-party host.
//
// Wikimedia rate-limits unauthenticated `upload.wikimedia.org` requests
// (HTTP 429) when many devices share an IP / app fingerprint. Server-side
// fetch with our identifying User-Agent passes; mirroring the bytes to our
// own bucket means the device only ever loads from Supabase Storage.
//
// Idempotent: same source URL → same storage key (SHA-1 of URL). Re-uploading
// is a cheap upsert.
//
// Self-contained (uses Node's crypto + global fetch + supabase-js). Runs from
// scripts only — never imported from app code, edge functions, or hooks.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

const BUCKET = 'collection-item-images';
// Mirrored images live under the system user so they're cleanly separated
// from user-owned uploads. Path: `<system-uid>/wiki-cache/<hash>.<ext>`.
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
const CACHE_PREFIX = `${SYSTEM_USER_ID}/wiki-cache`;
const USER_AGENT = 'collecta/1.0 (https://collecta.app; multi-agent-image-enrichment)';
// Wikipedia thumbnails at this width are ~100–300 KB — plenty for a 2-column
// grid cell at @3x DPR while keeping the bucket cheap and the device download
// fast. Bump if jaggies show up on tablets.
const THUMB_WIDTH = 1024;

const WIKI_FILE_RE = /\/wikipedia\/[^/]+\/[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)$/;

// Synchronous URL rewrite for hosts that accept on-demand sizing via query
// params (Unsplash). Wikimedia is NOT handled here — see resolveThumbUrl —
// because `upload.wikimedia.org` rejects direct widths it hasn't cached,
// so we have to mint thumbs via the MediaWiki API instead.
export function toThumbUrl(url: string, width: number = THUMB_WIDTH): string {
  if (url.startsWith('https://images.unsplash.com/')) {
    try {
      const u = new URL(url);
      u.searchParams.set('w', String(width));
      u.searchParams.set('q', '75');
      u.searchParams.set('fm', 'jpg');
      return u.toString();
    } catch {
      return url;
    }
  }
  return url;
}

// Ask the Commons API for a `width`-px thumbnail of a Wikipedia file URL.
// Necessary because `upload.wikimedia.org/wikipedia/.../thumb/...` only
// honours widths that have been pre-cached (HTTP 400 otherwise, per the
// 2024 thumbnail-size policy). The MediaWiki API mints fresh sizes on
// demand and caches them; it returns the resulting URL in `thumburl`.
async function resolveWikipediaThumbUrl(
  originalUrl: string,
  width: number
): Promise<string | null> {
  const m = WIKI_FILE_RE.exec(originalUrl);
  if (!m) return null;
  const filename = decodeURIComponent(m[1]);
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.searchParams.set('action', 'query');
  api.searchParams.set('titles', `File:${filename}`);
  api.searchParams.set('prop', 'imageinfo');
  api.searchParams.set('iiprop', 'url');
  api.searchParams.set('iiurlwidth', String(width));
  api.searchParams.set('format', 'json');
  api.searchParams.set('origin', '*');

  let res: Response;
  try {
    res = await fetch(api.toString(), { headers: { 'User-Agent': USER_AGENT } });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const data = (await res.json()) as {
    query?: {
      pages?: Record<string, { imageinfo?: { thumburl?: string; url?: string }[] }>;
    };
  };
  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  return info?.thumburl ?? info?.url ?? null;
}

// Pick the actual URL to fetch in place of the source. Wikimedia round-trips
// through the API; other hosts use the cheap sync rewrite.
export async function resolveThumbUrl(url: string, width: number = THUMB_WIDTH): Promise<string> {
  if (url.includes('upload.wikimedia.org/')) {
    const resolved = await resolveWikipediaThumbUrl(url, width);
    return resolved ?? url;
  }
  return toThumbUrl(url, width);
}

export interface MirrorOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  // Reuse a client across calls to avoid per-call connection setup.
  client?: SupabaseClient;
}

function extFromContentType(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('svg')) return 'svg';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

// Returns true when the URL already points at our bucket — nothing to mirror.
export function isMirroredUrl(url: string): boolean {
  return url.includes(`/${BUCKET}/`);
}

// Download bytes from `url` (with a polite UA so Wikimedia answers) and
// upload to Storage under a stable hashed key. Returns the public URL of
// the mirrored object, or `null` if the fetch / upload failed.
export async function mirrorImageToStorage(
  url: string,
  opts: MirrorOptions
): Promise<string | null> {
  if (isMirroredUrl(url)) return url;

  // Rewrite to a thumbnail variant when the host supports it. Hash the
  // thumb URL (not the source) so the same source going through a wider
  // pipeline later gets a fresh key, while same-thumb requests dedupe.
  const fetchUrl = await resolveThumbUrl(url);

  // Wikimedia rate-limits upload.wikimedia.org per IP and won't tell you
  // the window — back off and retry a few times before giving up.
  let res: Response | null = null;
  const DELAYS_MS = [0, 1500, 4000, 10000];
  for (let attempt = 0; attempt < DELAYS_MS.length; attempt++) {
    if (DELAYS_MS[attempt] > 0) await new Promise((r) => setTimeout(r, DELAYS_MS[attempt]));
    try {
      res = await fetch(fetchUrl, { headers: { 'User-Agent': USER_AGENT } });
    } catch (err) {
      console.warn('[image-mirror] fetch threw', fetchUrl, err);
      return null;
    }
    if (res.status !== 429 && res.status !== 503) break;
    console.warn(`[image-mirror] retry ${attempt + 1} after ${res.status}`, fetchUrl);
  }
  if (!res || !res.ok) {
    console.warn('[image-mirror] fetch non-ok', res?.status, fetchUrl);
    return null;
  }

  const contentType = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0].trim();
  if (!contentType.startsWith('image/')) {
    console.warn('[image-mirror] non-image content-type', contentType, fetchUrl);
    return null;
  }
  const ext = extFromContentType(contentType);

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength === 0) {
    console.warn('[image-mirror] empty body', fetchUrl);
    return null;
  }

  const hash = createHash('sha1').update(fetchUrl).digest('hex').slice(0, 16);
  const objectKey = `${CACHE_PREFIX}/${hash}.${ext}`;

  const client = opts.client ?? createClient(opts.supabaseUrl, opts.serviceRoleKey);
  const { error } = await client.storage
    .from(BUCKET)
    .upload(objectKey, bytes, { contentType, upsert: true });
  if (error) {
    console.warn('[image-mirror] upload error', error.message, objectKey);
    return null;
  }

  return client.storage.from(BUCKET).getPublicUrl(objectKey).data.publicUrl;
}

// Bulk variant: small concurrency cap so we don't exhaust upstream
// rate-limits or saturate the Supabase Storage HTTP pool.
export async function mirrorImagesByName(
  byName: Record<string, string | null>,
  opts: MirrorOptions
): Promise<Record<string, string | null>> {
  const client = opts.client ?? createClient(opts.supabaseUrl, opts.serviceRoleKey);
  const entries = Object.entries(byName);
  const out: Record<string, string | null> = {};
  // Sequential by default — Wikimedia rate-limits `upload.wikimedia.org`
  // per IP at burst rates and there's no published quota to size against.
  // The retry/backoff inside `mirrorImageToStorage` is the durable defence;
  // dropping concurrency just makes the happy path quieter.
  for (const [name, url] of entries) {
    if (!url) {
      out[name] = null;
      continue;
    }
    out[name] = await mirrorImageToStorage(url, { ...opts, client });
  }
  return out;
}
