// Single source of truth for parsing the object key out of a Supabase
// Storage public URL. Used by edge functions that need to clean up files
// owned by a row before/after deleting the row. Mirrored by the same
// parsing rule in src/services/find-photo.service.ts — keep them in sync.
//
// Public URLs look like:
//   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<key>
// where <key> is everything after `/<bucket>/` (may contain slashes).

export function objectKeyFromPublicUrl(publicUrl: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const i = publicUrl.indexOf(marker);
  return i === -1 ? null : publicUrl.slice(i + marker.length);
}
