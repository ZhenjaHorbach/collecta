/* eslint-disable import/first */
const mockDismissTo = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    dismissTo: (...args: unknown[]) => mockDismissTo(...args),
    back: (...args: unknown[]) => mockBack(...args),
  },
}));

import { goBackOrReturn, withReturnTo } from '../return-to.utils';
/* eslint-enable import/first */

beforeEach(() => {
  mockDismissTo.mockClear();
  mockBack.mockClear();
});

describe('withReturnTo', () => {
  it('appends with `?` when the path has no query string', () => {
    expect(withReturnTo('/(tabs)/camera', '/collection/abc')).toBe(
      '/(tabs)/camera?return_to=%2Fcollection%2Fabc'
    );
  });

  it('appends with `&` when the path already has a query string', () => {
    expect(withReturnTo('/(tabs)/camera?collection_item_id=42', '/collection/abc')).toBe(
      '/(tabs)/camera?collection_item_id=42&return_to=%2Fcollection%2Fabc'
    );
  });

  it('URL-encodes the return path so query chars survive the round-trip', () => {
    expect(withReturnTo('/(tabs)/camera', '/find/abc?from=feed&id=1')).toBe(
      '/(tabs)/camera?return_to=%2Ffind%2Fabc%3Ffrom%3Dfeed%26id%3D1'
    );
  });
});

describe('goBackOrReturn', () => {
  it('dismisses the stack to the target when returnTo is provided', () => {
    goBackOrReturn('/collection/abc');
    expect(mockDismissTo).toHaveBeenCalledWith('/collection/abc');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('falls back to router.back() when returnTo is null', () => {
    goBackOrReturn(null);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockDismissTo).not.toHaveBeenCalled();
  });
});
