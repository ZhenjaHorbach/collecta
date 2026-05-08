// formatDate / formatFindDateTime use Intl APIs with the host locale. We
// deliberately don't pin the locale (CLAUDE.md: device-locale formatting is
// the design intent), so these tests assert shape, not exact strings.

import { formatDate, formatFindDateTime } from '../datetime.utils';

describe('formatDate', () => {
  it('returns a non-empty string containing the year', () => {
    const out = formatDate('2026-05-08T10:00:00Z');
    expect(out).toMatch(/2026/);
  });

  it('is deterministic for the same input', () => {
    const a = formatDate('2026-05-08T10:00:00Z');
    const b = formatDate('2026-05-08T10:00:00Z');
    expect(a).toBe(b);
  });
});

describe('formatFindDateTime', () => {
  it('combines the date and a HH:MM time separated by a comma', () => {
    const out = formatFindDateTime('2026-05-08T10:00:00Z');
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/,/);
    // HH:MM with two digits each — the time portion. Not pinning hour to a
    // specific number because toLocaleTimeString uses the host timezone.
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });
});
