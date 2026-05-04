import * as Linking from 'expo-linking';

export type ParsedLink =
  | { kind: 'find'; id: string }
  | { kind: 'collection'; id: string }
  | { kind: 'user'; id: string }
  | null;

export function buildFindUrl(id: string): string {
  return Linking.createURL(`/find/${id}`);
}

export function buildCollectionUrl(id: string): string {
  return Linking.createURL(`/collection/${id}`);
}

export function buildUserUrl(id: string): string {
  return Linking.createURL(`/user/${id}`);
}

// Strict on shape: we only recognise the three URL flavors the app actually
// produces. Unknown paths return null so callers can fall back to the cold
// start route instead of pushing garbage onto the stack.
export function parseIncomingUrl(url: string): ParsedLink {
  let parsed: Linking.ParsedURL;
  try {
    parsed = Linking.parse(url);
  } catch {
    return null;
  }
  const path = (parsed.path ?? '').replace(/^\/+/, '');
  if (!path) return null;
  const [head, id, ...rest] = path.split('/');
  if (!id || rest.length > 0) return null;
  if (head === 'find') return { kind: 'find', id };
  if (head === 'collection') return { kind: 'collection', id };
  if (head === 'user') return { kind: 'user', id };
  return null;
}

export function routeForLink(link: NonNullable<ParsedLink>): string {
  return `/${link.kind}/${link.id}`;
}
