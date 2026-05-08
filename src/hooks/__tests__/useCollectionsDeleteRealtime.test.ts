// Mirror of useFeedRealtime for the collections DELETE channel. Same
// channel-uniquification and unsubscribe contract.

/* eslint-disable import/first */
const mockChannelChain = {
  on: jest.fn().mockImplementation(function (this: unknown) {
    return mockChannelChain;
  }),
  subscribe: jest.fn().mockImplementation(function (this: unknown) {
    return mockChannelChain;
  }),
};
const mockChannel = jest.fn().mockReturnValue(mockChannelChain);
const mockRemoveChannel = jest.fn();

jest.mock('@services/supabase.service', () => ({
  supabase: {
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

import { renderHook } from '@testing-library/react-native';

import { useCollectionsDeleteRealtime } from '../useCollectionsDeleteRealtime';
/* eslint-enable import/first */

beforeEach(() => {
  mockChannel.mockClear();
  mockRemoveChannel.mockClear();
  mockChannelChain.on.mockClear();
  mockChannelChain.subscribe.mockClear();
});

describe('useCollectionsDeleteRealtime', () => {
  it('subscribes with a uniquely-named channel and one DELETE listener', () => {
    renderHook(() => useCollectionsDeleteRealtime(jest.fn()));
    const name = mockChannel.mock.calls[0][0] as string;
    expect(name.startsWith('collections-delete:')).toBe(true);
    expect(mockChannelChain.on).toHaveBeenCalledTimes(1);
    expect(mockChannelChain.subscribe).toHaveBeenCalledTimes(1);
  });

  it('removes the channel on unmount', () => {
    const { unmount } = renderHook(() => useCollectionsDeleteRealtime(jest.fn()));
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it('uniquifies the channel name across remounts', () => {
    renderHook(() => useCollectionsDeleteRealtime(jest.fn())).unmount();
    renderHook(() => useCollectionsDeleteRealtime(jest.fn()));
    expect(mockChannel.mock.calls[0][0]).not.toBe(mockChannel.mock.calls[1][0]);
  });
});
