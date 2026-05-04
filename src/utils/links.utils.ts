import * as Linking from 'expo-linking';

// Single source of truth for share URLs. Every callsite that produces a link
// to a Collecta entity goes through one of these so the scheme stays in sync
// with `app.json` and Expo Router's file routes. Adding a new entity = a new
// `build<Entity>Url` here + a `<entity>/[id].tsx` route. See
// `.claude/skills/deep-linking/SKILL.md` for the full pattern.

export function buildFindUrl(id: string): string {
  return Linking.createURL(`/find/${id}`);
}

export function buildCollectionUrl(id: string): string {
  return Linking.createURL(`/collection/${id}`);
}
