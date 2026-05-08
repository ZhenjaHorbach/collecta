// EmptyState: pure presentational with conditional pieces. Tests pin that
// the optional fields actually render only when supplied — easy to break
// with a refactor that introduces a default empty string.

import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { EmptyState } from '../EmptyState/EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('omits subtitle, icon, action when not supplied', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.queryByText('A subtitle')).toBeNull();
    // Icon is text content; if no icon prop, the "🔍" emoji from another
    // test wouldn't appear. Stand-in: the only Text rendered is the title.
  });

  it('renders the subtitle when supplied', () => {
    render(<EmptyState title="Empty" subtitle="No items yet" />);
    expect(screen.getByText('No items yet')).toBeTruthy();
  });

  it('renders the icon when supplied', () => {
    render(<EmptyState title="Empty" icon="🔍" />);
    expect(screen.getByText('🔍')).toBeTruthy();
  });

  it('renders the action node when supplied', () => {
    render(<EmptyState title="Empty" action={<Text testID="cta">Reload</Text>} />);
    expect(screen.getByTestId('cta')).toBeTruthy();
  });
});
