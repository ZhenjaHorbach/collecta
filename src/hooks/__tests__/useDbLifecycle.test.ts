// useDbLifecycle: connect on mount, disconnect on unmount. Pin the wiring
// so a future PowerSync swap can't quietly drop the lifecycle hooks.

/* eslint-disable import/first */
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

// Inline `connector` rather than referencing an outer const — jest.mock
// factories evaluate before the module body's `const` declarations, so an
// outer `const mockConnector = ...` would be undefined at factory time.
jest.mock('@services/database.service', () => ({
  db: {
    connect: (...args: unknown[]) => mockConnect(...args),
    disconnect: () => mockDisconnect(),
  },
  connector: { id: 'connector' },
}));

import { renderHook } from '@testing-library/react-native';

import { useDbLifecycle } from '../useDbLifecycle';
/* eslint-enable import/first */

beforeEach(() => {
  mockConnect.mockReset();
  mockDisconnect.mockReset();
});

describe('useDbLifecycle', () => {
  it('connects with the connector on mount', () => {
    renderHook(() => useDbLifecycle());
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith({ id: 'connector' });
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it('disconnects on unmount', () => {
    const { unmount } = renderHook(() => useDbLifecycle());
    unmount();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('does not connect twice across re-renders', () => {
    const { rerender } = renderHook(() => useDbLifecycle());
    rerender(undefined);
    rerender(undefined);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });
});
