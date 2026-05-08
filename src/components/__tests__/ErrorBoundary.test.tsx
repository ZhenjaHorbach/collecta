// ErrorBoundary: class component with state machine. Tests pin: catches a
// child throw → renders fallback, custom fallback prop overrides default,
// reset() restores children. The console.error in componentDidCatch is
// expected during the test — silence it so the suite output stays clean.

import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

// eslint-disable-next-line import/first
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';

function Boom(): React.ReactElement {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  let warn: jest.SpiedFunction<typeof console.error>;
  beforeEach(() => {
    warn = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Text>Healthy</Text>
      </ErrorBoundary>
    );
    expect(screen.getByText('Healthy')).toBeTruthy();
  });

  it('renders the default fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('common.error')).toBeTruthy();
    expect(screen.getByText('common.tryAgain')).toBeTruthy();
    expect(screen.getByText('boom')).toBeTruthy();
  });

  it('renders the custom fallback when supplied', () => {
    render(
      <ErrorBoundary
        fallback={(reset, error) => (
          <TouchableOpacity onPress={reset} testID="custom">
            <Text>{`custom:${error.message}`}</Text>
          </TouchableOpacity>
        )}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('custom:boom')).toBeTruthy();
  });

  it('reset() returns to children after the throwing child is replaced', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('common.error')).toBeTruthy();
    // Order matters: swap the children FIRST (the boundary still shows the
    // fallback because its error state survived the prop change), THEN reset
    // — otherwise reset re-renders <Boom /> and the boundary errors again.
    rerender(
      <ErrorBoundary>
        <Text>Healthy now</Text>
      </ErrorBoundary>
    );
    fireEvent.press(screen.getByText('common.tryAgain'));
    expect(screen.getByText('Healthy now')).toBeTruthy();
  });
});
