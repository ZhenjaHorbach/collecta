// AchievementSheet renders different visual + copy variants for
// locked vs unlocked, and formats unlocked_at via formatDate when present.
// Tests pin the locked-hint, the date-vs-no-date branch, and that the sheet
// is hidden when achievement is null.

import { render, screen } from '@testing-library/react-native';

jest.mock('@components/BottomSheet', () => ({
  // Simple pass-through so we can inspect children directly.

  BottomSheet: ({ visible, children }: { visible: boolean; children: any }) =>
    visible ? children : null,
}));

jest.mock('@utils/datetime.utils', () => ({
  formatDate: (iso: string) => `[date:${iso}]`,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
  }),
}));

// eslint-disable-next-line import/first
import { AchievementSheet } from '../AchievementSheet/AchievementSheet';

const BASE = {
  id: 'a1',
  code: 'first_find',
  title: 'First Find',
  description: 'Take your first photo.',
  icon: '📸',
  xp_reward: 20,
  sort_order: 1,
  unlocked: false,
  unlockedAt: null,
};

describe('AchievementSheet', () => {
  it('renders nothing when achievement is null', () => {
    render(<AchievementSheet achievement={null} onClose={() => {}} />);
    expect(screen.queryByText('First Find')).toBeNull();
  });

  it('renders title, description, icon, xp reward', () => {
    render(<AchievementSheet achievement={BASE} onClose={() => {}} />);
    expect(screen.getByText('First Find')).toBeTruthy();
    expect(screen.getByText('Take your first photo.')).toBeTruthy();
    expect(screen.getByText('📸')).toBeTruthy();
    expect(screen.getByText(/profile\.achievements\.detail\.xpReward.*"xp":20/)).toBeTruthy();
  });

  it('shows the locked label and hint when not unlocked', () => {
    render(<AchievementSheet achievement={BASE} onClose={() => {}} />);
    expect(screen.getByText('profile.achievements.detail.locked')).toBeTruthy();
    expect(screen.getByText('profile.achievements.detail.lockedHint')).toBeTruthy();
  });

  it('shows the unlockedOn label with the formatted date when present', () => {
    render(
      <AchievementSheet
        achievement={{ ...BASE, unlocked: true, unlockedAt: '2026-05-01T10:00:00Z' }}
        onClose={() => {}}
      />
    );
    expect(
      screen.getByText(
        /profile\.achievements\.detail\.unlockedOn.*"date":"\[date:2026-05-01T10:00:00Z\]"/
      )
    ).toBeTruthy();
    expect(screen.queryByText('profile.achievements.detail.lockedHint')).toBeNull();
  });

  it('shows the bare unlocked label when unlockedAt is missing', () => {
    render(
      <AchievementSheet
        achievement={{ ...BASE, unlocked: true, unlockedAt: null }}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('profile.achievements.detail.unlocked')).toBeTruthy();
  });
});
