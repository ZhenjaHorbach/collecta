// FeedItem branches we care about: avatar fallback to initial-letter when
// no avatarUrl, sharedBadge only when sharedCollections > 0, notes block
// only when notes is truthy, collection-icon prefix when icon exists. The
// inline `formatRelative` is duplicated from NearbyFindCard — covered there
// in depth; here we just hit the minutesAgo branch to keep the test tight.

import { render, screen } from '@testing-library/react-native';

jest.mock('expo-image', () => ({
  Image: () => null,
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockToggle = jest.fn();
jest.mock('@hooks/useReactions', () => ({
  useReactions: () => ({
    counts: { like: 0, fire: 0, wow: 0 },
    mine: new Set(),
    toggle: mockToggle,
  }),
}));

jest.mock('@components/ReactionBar', () => ({
  ReactionBar: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
  }),
}));

// eslint-disable-next-line import/first
import { FeedItem } from '../FeedItem/FeedItem';

const BASE = {
  findId: 'f1',
  userId: 'u1',
  collectionId: 'c1',
  collectionItemId: 'i1',
  collectionTitle: 'Doors',
  collectionIcon: '🚪',
  collectionCategory: 'urban' as const,
  itemName: 'Brass knob',
  photoUrl: 'https://x',
  locationLat: null,
  locationLng: null,
  notes: null,
  createdAt: '2026-05-08T11:30:00Z',
  creatorId: 'u1',
  creatorUsername: 'alice',
  creatorDisplayName: 'Alice',
  creatorAvatarUrl: null,
  score: 1,
  sharedCollections: 0,
  geoScore: 0,
  reactionsCount: 0,
};

describe('FeedItem', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-08T12:00:00Z'));
    mockPush.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('falls back to the creator-initial when no avatar URL is set', () => {
    render(<FeedItem item={BASE} />);
    // Alice → "A"
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('hides the sharedBadge when sharedCollections is 0', () => {
    render(<FeedItem item={BASE} />);
    expect(screen.queryByText(/feed\.sharedBadge/)).toBeNull();
  });

  it('renders the sharedBadge when sharedCollections > 0', () => {
    render(<FeedItem item={{ ...BASE, sharedCollections: 3 }} />);
    expect(screen.getByText(/feed\.sharedBadge.*"count":3/)).toBeTruthy();
  });

  it('renders notes only when present', () => {
    const { rerender } = render(<FeedItem item={BASE} />);
    expect(screen.queryByText('Found at the corner')).toBeNull();
    rerender(<FeedItem item={{ ...BASE, notes: 'Found at the corner' }} />);
    expect(screen.getByText('Found at the corner')).toBeTruthy();
  });

  it('prefixes the collection title with the icon when set', () => {
    render(<FeedItem item={BASE} />);
    expect(screen.getByText(/🚪 Doors/)).toBeTruthy();
  });

  it('renders the title without an icon prefix when collectionIcon is null', () => {
    render(<FeedItem item={{ ...BASE, collectionIcon: null }} />);
    expect(screen.getByText('Doors')).toBeTruthy();
    expect(screen.queryByText(/🚪 Doors/)).toBeNull();
  });

  it('uses the inline formatRelative for "30 minutes ago"', () => {
    render(<FeedItem item={BASE} />); // createdAt = 11:30, now = 12:00
    expect(screen.getByText(/map\.minutesAgo.*"count":30/)).toBeTruthy();
  });
});
