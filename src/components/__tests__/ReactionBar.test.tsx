// ReactionBar: count-only-when-positive, accessibilityLabel formatting,
// disabled gate, onToggle wiring per type.

import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
  }),
}));

// eslint-disable-next-line import/first
import { ReactionBar } from '../ReactionBar/ReactionBar';

describe('ReactionBar', () => {
  it('renders all three reaction emojis', () => {
    render(
      <ReactionBar counts={{ like: 0, fire: 0, wow: 0 }} mine={new Set()} onToggle={() => {}} />
    );
    expect(screen.getByText('👍')).toBeTruthy();
    expect(screen.getByText('🔥')).toBeTruthy();
    expect(screen.getByText('😮')).toBeTruthy();
  });

  it('omits the count number when count is 0', () => {
    render(
      <ReactionBar counts={{ like: 0, fire: 0, wow: 0 }} mine={new Set()} onToggle={() => {}} />
    );
    // No "0" should appear next to the emoji.
    expect(screen.queryByText('0')).toBeNull();
  });

  it('renders the count when positive', () => {
    render(
      <ReactionBar counts={{ like: 3, fire: 0, wow: 1 }} mine={new Set()} onToggle={() => {}} />
    );
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('fires onToggle with the right reaction type', () => {
    const onToggle = jest.fn();
    render(
      <ReactionBar counts={{ like: 0, fire: 0, wow: 0 }} mine={new Set()} onToggle={onToggle} />
    );
    fireEvent.press(screen.getByText('🔥'));
    expect(onToggle).toHaveBeenCalledWith('fire');
  });

  it('does not fire onToggle when disabled', () => {
    const onToggle = jest.fn();
    render(
      <ReactionBar
        counts={{ like: 0, fire: 0, wow: 0 }}
        mine={new Set()}
        onToggle={onToggle}
        disabled
      />
    );
    fireEvent.press(screen.getByText('👍'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('accessibilityLabel interpolates the per-reaction translated label', () => {
    render(
      <ReactionBar counts={{ like: 0, fire: 0, wow: 0 }} mine={new Set()} onToggle={() => {}} />
    );
    // t('reactions.aria.toggle', { label: t('reactions.like') }) →
    // mock returns the JSON of args, so we look for 'reactions.like'.
    expect(screen.getByLabelText(/reactions\.aria\.toggle.*reactions\.like/)).toBeTruthy();
  });
});
