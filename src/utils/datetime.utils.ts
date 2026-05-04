// `toLocaleDateString` / `toLocaleTimeString` already pick up the device
// locale when called with `undefined`, so the formatting itself is i18n-aware
// without an i18next round-trip. Keeping these helpers in `utils/` (pure, no
// hooks) means screens can share them without each owning their own copy.

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatFindDateTime(iso: string): string {
  const time = new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${formatDate(iso)}, ${time}`;
}
