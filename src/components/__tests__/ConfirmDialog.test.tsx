// ConfirmDialog: pin the imperative API contract — confirm() resolves true
// when the user accepts, false when they cancel; notify() resolves on
// dismiss. The host renders the right buttons per request kind. The 220 ms
// gap between press and resolve lets the modal fade out before the call
// site continues; tests advance fake timers across that window.

import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@hooks/useThemeVars', () => ({
  useThemeVars: () => ({}),
}));

// eslint-disable-next-line import/first
import { ConfirmDialogHost } from '../ConfirmDialog/ConfirmDialogHost';
// eslint-disable-next-line import/first
import { confirm, notify } from '../ConfirmDialog/state';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

async function flushTimersAndPromises(): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

describe('ConfirmDialog', () => {
  it('renders confirm + cancel buttons and resolves true on confirm tap', async () => {
    render(<ConfirmDialogHost />);
    let resolved: boolean | undefined;
    act(() => {
      void confirm({
        title: 'Sign out?',
        body: 'You will be signed out of all devices.',
        confirmLabel: 'Sign out',
        cancelLabel: 'Cancel',
        destructive: true,
      }).then((v) => {
        resolved = v;
      });
    });
    expect(screen.getByText('Sign out?')).toBeTruthy();
    expect(screen.getByText('You will be signed out of all devices.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));
    await flushTimersAndPromises();
    expect(resolved).toBe(true);
  });

  it('resolves false when the cancel button is tapped', async () => {
    render(<ConfirmDialogHost />);
    let resolved: boolean | undefined;
    act(() => {
      void confirm({
        title: 'Delete?',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
      }).then((v) => {
        resolved = v;
      });
    });
    fireEvent.press(screen.getByTestId('confirm-dialog-cancel'));
    await flushTimersAndPromises();
    expect(resolved).toBe(false);
  });

  it('resolves false when the backdrop is tapped', async () => {
    render(<ConfirmDialogHost />);
    let resolved: boolean | undefined;
    act(() => {
      void confirm({
        title: 'Discard?',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep',
      }).then((v) => {
        resolved = v;
      });
    });
    fireEvent.press(screen.getByTestId('confirm-dialog-backdrop'));
    await flushTimersAndPromises();
    expect(resolved).toBe(false);
  });

  it('renders a single OK button for notify and resolves on tap', async () => {
    render(<ConfirmDialogHost />);
    let resolved = false;
    act(() => {
      void notify({ title: 'Saved', buttonLabel: 'OK' }).then(() => {
        resolved = true;
      });
    });
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.queryByTestId('confirm-dialog-confirm')).toBeNull();
    expect(screen.queryByTestId('confirm-dialog-cancel')).toBeNull();
    fireEvent.press(screen.getByTestId('confirm-dialog-ok'));
    await flushTimersAndPromises();
    expect(resolved).toBe(true);
  });
});
