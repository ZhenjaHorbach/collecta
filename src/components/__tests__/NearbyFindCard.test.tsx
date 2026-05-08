// NearbyFindCard contains an inline `formatRelative` formatter (justNow /
// minutesAgo / hoursAgo / daysAgo) that's not exported. The formatter is
// duplicated in FeedItem too — both tests pin it via the rendered output.

import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('expo-image', () => ({
  Image: () => null,
}));

jest.mock('@utils/geo.utils', () => ({
  formatDistanceKm: (km: number) => `${km}km`,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
  }),
}));

// eslint-disable-next-line import/first
import { NearbyFindCard } from '../NearbyFindCard/NearbyFindCard';

const FIND = {
  id: 'f1',
  lat: 0,
  lng: 0,
  photoUrl: 'https://x',
  collectionId: 'c1',
  collectionTitle: 'Doors',
  collectionEmoji: '🚪',
  category: 'urban' as const,
  itemName: 'Brass knob',
  createdAt: new Date().toISOString(),
};

describe('NearbyFindCard — formatRelative branches', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-08T12:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('renders justNow when the find is under a minute old', () => {
    // 10s ago → Math.round(10/60) = 0 → minutes < 1 → justNow branch.
    render(
      <NearbyFindCard
        find={{ ...FIND, createdAt: '2026-05-08T11:59:50Z' }}
        distanceKm={0.3}
        onPress={() => {}}
      />
    );
    expect(screen.getByText(/map\.justNow/)).toBeTruthy();
  });

  it('renders minutesAgo with count for 1..59 min', () => {
    render(
      <NearbyFindCard
        find={{ ...FIND, createdAt: '2026-05-08T11:30:00Z' }}
        distanceKm={1}
        onPress={() => {}}
      />
    );
    expect(screen.getByText(/map\.minutesAgo.*"count":30/)).toBeTruthy();
  });

  it('renders hoursAgo with count for 60min..23h', () => {
    render(
      <NearbyFindCard
        find={{ ...FIND, createdAt: '2026-05-08T07:00:00Z' }}
        distanceKm={1}
        onPress={() => {}}
      />
    );
    expect(screen.getByText(/map\.hoursAgo.*"count":5/)).toBeTruthy();
  });

  it('renders daysAgo for ≥24h', () => {
    render(
      <NearbyFindCard
        find={{ ...FIND, createdAt: '2026-05-05T12:00:00Z' }}
        distanceKm={1}
        onPress={() => {}}
      />
    );
    expect(screen.getByText(/map\.daysAgo.*"count":3/)).toBeTruthy();
  });
});

describe('NearbyFindCard — interaction', () => {
  it('forwards the find to onPress', () => {
    const onPress = jest.fn();
    render(<NearbyFindCard find={FIND} distanceKm={1} onPress={onPress} />);
    fireEvent.press(screen.getByText(/Brass knob/));
    expect(onPress).toHaveBeenCalledWith(FIND);
  });
});
