// Button: pin the behaviour that breaks loudest in prod — spinner replaces
// the label while loading (no double-submit), disabled+loading both block
// presses. Visual variants live in NativeWind classes that don't survive
// the jsdom render; verify those via Maestro / screenshot tests, not here.

import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@hooks/useColors', () => ({
  useColors: () => ({ onGold: '#000', text: '#fff' }),
}));

// eslint-disable-next-line import/first
import { Button } from '../Button/Button';

describe('Button', () => {
  it('renders the label by default', () => {
    render(<Button label="Submit" />);
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('replaces the label with a spinner while loading', () => {
    render(<Button label="Submit" loading />);
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('does not fire onPress while loading', () => {
    const onPress = jest.fn();
    render(<Button label="Submit" loading onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Submit" disabled onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('fires onPress for an enabled button', () => {
    const onPress = jest.fn();
    render(<Button label="Submit" onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
