// share.service: capture-card path uses view-shot + expo-sharing; fallback
// uses RN Share. iOS expects { url, message } shape, Android folds URL into
// the message body. Tests pin the platform branching and the capture-failure
// fallback so a missing ref or a broken view-shot doesn't crash the share.

/* eslint-disable import/first */
const mockShareAsync = jest.fn();
const mockIsAvailableAsync = jest.fn();
const mockCaptureRef = jest.fn();
const mockShare = jest.fn();
const mockState = { os: 'ios' as 'ios' | 'android' };

jest.mock('expo-sharing', () => ({
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
  isAvailableAsync: () => mockIsAvailableAsync(),
}));

jest.mock('react-native-view-shot', () => ({
  captureRef: (...args: unknown[]) => mockCaptureRef(...args),
}));

jest.mock('react-native', () => ({
  Share: { share: (...args: unknown[]) => mockShare(...args) },
  Platform: {
    get OS() {
      return mockState.os;
    },
  },
}));

import { shareCardImage, shareUrl } from '../share.service';
/* eslint-enable import/first */

beforeEach(() => {
  mockShareAsync.mockReset();
  mockIsAvailableAsync.mockReset();
  mockCaptureRef.mockReset();
  mockShare.mockReset();
  mockState.os = 'ios';
  mockIsAvailableAsync.mockResolvedValue(true);
  mockCaptureRef.mockResolvedValue('file:///tmp/card.png');
  mockShareAsync.mockResolvedValue(undefined);
  mockShare.mockResolvedValue(undefined);
});

describe('shareCardImage', () => {
  it('falls back to text+URL share when ref.current is null', async () => {
    await shareCardImage(
      { current: null },
      { message: 'Look at this', url: 'https://collecta.app/find/1' }
    );
    expect(mockCaptureRef).not.toHaveBeenCalled();
    expect(mockShare).toHaveBeenCalled();
  });

  it('captures the view and hands the file to Sharing.shareAsync on iOS', async () => {
    await shareCardImage(
      { current: { nodeHandle: 'fake' } as any },
      { message: 'm', url: 'u', dialogTitle: 'Share' }
    );
    expect(mockCaptureRef).toHaveBeenCalled();
    expect(mockShareAsync).toHaveBeenCalledWith('file:///tmp/card.png', {
      mimeType: 'image/png',
      dialogTitle: 'Share',
      UTI: 'public.png',
    });
  });

  it('falls back to text share when expo-sharing is unavailable (web)', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    await shareCardImage(
      { current: { nodeHandle: 'fake' } as any },
      { message: 'm', url: 'https://collecta.app/find/1' }
    );
    expect(mockShare).toHaveBeenCalled();
  });

  it('falls back to text share when capture throws', async () => {
    mockCaptureRef.mockRejectedValue(new Error('view-shot crash'));
    await shareCardImage({ current: { nodeHandle: 'fake' } as any }, { message: 'm', url: 'u' });
    expect(mockShare).toHaveBeenCalled();
  });
});

describe('shareUrl — platform shape', () => {
  it('iOS: { url, message } separately', async () => {
    mockState.os = 'ios';
    await shareUrl({ message: 'Look', url: 'https://collecta.app/find/1' });
    expect(mockShare).toHaveBeenCalledWith(
      { url: 'https://collecta.app/find/1', message: 'Look' },
      { dialogTitle: undefined }
    );
  });

  it('Android: URL folded into the message body', async () => {
    mockState.os = 'android';
    await shareUrl({ message: 'Look', url: 'https://collecta.app/find/1' });
    expect(mockShare).toHaveBeenCalledWith(
      { message: 'Look\nhttps://collecta.app/find/1' },
      { dialogTitle: undefined }
    );
  });
});
