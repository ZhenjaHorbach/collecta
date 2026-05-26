import type { Href } from 'expo-router';
import { router } from 'expo-router';

// Query-param key carried through `/(tabs)/camera?return_to=…` so the camera
// can route the user back to where they came from. See goBackOrReturn for the
// reason it exists — pushing into a tab route from a non-tab screen discards
// the outer stack, so plain router.back() lands on the last-focused tab
// instead of the originating screen.
const RETURN_TO_KEY = 'return_to';

// Append `return_to=<encoded path>` to a `router.push` URL. Caller passes the
// FULL destination path including any prior query string — the helper just
// picks `?` vs `&`. Pass the absolute path you want the camera to navigate
// back to (e.g. `/collection/abc`, `/find/xyz`).
//
// Returns `Href` (cast) because Expo Router types routes against the generated
// route table — concatenating a query param at runtime can't satisfy the
// literal-union typing, but the produced string is a valid path. Keeping the
// cast inside this helper lets callers use it without sprinkling `as Href`.
export function withReturnTo(path: string, returnTo: string): Href {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}${RETURN_TO_KEY}=${encodeURIComponent(returnTo)}` as Href;
}

// Companion to withReturnTo for the screen that owns close/back logic. When
// `returnTo` is set, `dismissTo` unwinds the stack to the target — popping the
// camera/tabs frame instead of leaving it behind, which is what `router.replace`
// would do (replace just swaps the current route; the outer tab frame stays in
// history and the user has to press back twice to escape it).
//
// When `returnTo` is null we fall back to plain `router.back()` so tab-bar
// entries keep their normal back behavior.
export function goBackOrReturn(returnTo: string | null): void {
  if (returnTo) {
    router.dismissTo(returnTo as Href);
    return;
  }
  router.back();
}
