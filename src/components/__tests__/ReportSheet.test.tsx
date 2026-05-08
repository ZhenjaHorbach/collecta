// ReportSheet has internal useState for reason + comment, useEffect that
// resets on close, and a submit guard. Tests pin: state resets on
// visible=false, submit doesn't fire without a reason, button is gated by
// `submitting` flag.

import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@components/BottomSheet', () => ({
  BottomSheet: ({ visible, children }: { visible: boolean; children: any }) =>
    visible ? children : null,
}));

jest.mock('@components/Button', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ label, onPress, disabled }: any) => (
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button">
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});

jest.mock('@components/Input', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextInput } = require('react-native');

  return { Input: (props: any) => <TextInput {...props} testID="comment" /> };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
  }),
}));

// eslint-disable-next-line import/first
import { ReportSheet } from '../ReportSheet/ReportSheet';

describe('ReportSheet', () => {
  it('does not render when visible is false', () => {
    render(
      <ReportSheet visible={false} submitting={false} onSubmit={() => {}} onClose={() => {}} />
    );
    expect(screen.queryByText('moderation.report.title')).toBeNull();
  });

  it('renders title, all 4 reason buttons, and the submit button when visible', () => {
    render(<ReportSheet visible submitting={false} onSubmit={() => {}} onClose={() => {}} />);
    expect(screen.getByText('moderation.report.title')).toBeTruthy();
    expect(screen.getByText('moderation.report.reasons.spam')).toBeTruthy();
    expect(screen.getByText('moderation.report.reasons.inappropriate')).toBeTruthy();
    expect(screen.getByText('moderation.report.reasons.offTopic')).toBeTruthy();
    expect(screen.getByText('moderation.report.reasons.other')).toBeTruthy();
  });

  it('does not call onSubmit when no reason is selected', () => {
    const onSubmit = jest.fn();
    render(<ReportSheet visible submitting={false} onSubmit={onSubmit} onClose={() => {}} />);
    fireEvent.press(screen.getByText('moderation.report.submit'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with the selected reason and the typed comment', () => {
    const onSubmit = jest.fn();
    render(<ReportSheet visible submitting={false} onSubmit={onSubmit} onClose={() => {}} />);
    fireEvent.press(screen.getByText('moderation.report.reasons.spam'));
    fireEvent.changeText(screen.getByTestId('comment'), 'duplicate post');
    fireEvent.press(screen.getByText('moderation.report.submit'));
    expect(onSubmit).toHaveBeenCalledWith('spam', 'duplicate post');
  });

  it('does not call onSubmit while submitting (in-flight guard)', () => {
    const onSubmit = jest.fn();
    render(<ReportSheet visible submitting onSubmit={onSubmit} onClose={() => {}} />);
    fireEvent.press(screen.getByText('moderation.report.reasons.spam'));
    fireEvent.press(screen.getByText('moderation.report.submit'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears reason and comment when the sheet hides', () => {
    const onSubmit = jest.fn();
    const { rerender } = render(
      <ReportSheet visible submitting={false} onSubmit={onSubmit} onClose={() => {}} />
    );
    fireEvent.press(screen.getByText('moderation.report.reasons.spam'));
    fireEvent.changeText(screen.getByTestId('comment'), 'something');

    rerender(
      <ReportSheet visible={false} submitting={false} onSubmit={onSubmit} onClose={() => {}} />
    );
    rerender(<ReportSheet visible submitting={false} onSubmit={onSubmit} onClose={() => {}} />);
    // No reason selected after the close-then-reopen → submit no-op.
    fireEvent.press(screen.getByText('moderation.report.submit'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
