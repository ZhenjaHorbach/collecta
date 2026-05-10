// useDocumentTitle: pin the pathname → i18n key mapping so adding a new
// route + forgetting to register it here surfaces as a failing test rather
// than a silent fallback to the bare app name.

/* eslint-disable import/first */
const mockPathnameRef = { value: '/' };
const mockPlatformState = { OS: 'web' as 'web' | 'ios' | 'android' };

jest.mock('expo-router', () => ({
  usePathname: () => mockPathnameRef.value,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => `T(${key})` }),
}));

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatformState.OS;
    },
  },
}));

import { renderHook } from '@testing-library/react-native';

import { useDocumentTitle } from '../useDocumentTitle';
/* eslint-enable import/first */

const documentRef: { title: string } = { title: '' };

beforeEach(() => {
  mockPlatformState.OS = 'web';
  mockPathnameRef.value = '/';
  documentRef.title = '';
  Object.defineProperty(globalThis, 'document', {
    value: documentRef,
    configurable: true,
  });
});

describe('useDocumentTitle', () => {
  it('sets "<feed> — Collecta" for the root tab path', () => {
    mockPathnameRef.value = '/';
    renderHook(() => useDocumentTitle());
    expect(documentRef.title).toBe('T(tabs.feed) — Collecta');
  });

  it('uses the matching i18n key for /settings', () => {
    mockPathnameRef.value = '/settings';
    renderHook(() => useDocumentTitle());
    expect(documentRef.title).toBe('T(profile.settings) — Collecta');
  });

  it('routes /collection/:id to collections.title', () => {
    mockPathnameRef.value = '/collection/abc-123';
    renderHook(() => useDocumentTitle());
    expect(documentRef.title).toBe('T(collections.title) — Collecta');
  });

  it('routes /collection/edit/:id ahead of the bare collection match', () => {
    mockPathnameRef.value = '/collection/edit/abc-123';
    renderHook(() => useDocumentTitle());
    expect(documentRef.title).toBe('T(collections.edit.trigger) — Collecta');
  });

  it('routes /find/:id to find.headerTitle', () => {
    mockPathnameRef.value = '/find/f-1';
    renderHook(() => useDocumentTitle());
    expect(documentRef.title).toBe('T(find.headerTitle) — Collecta');
  });

  it('falls back to bare "Collecta" for unrecognised paths', () => {
    mockPathnameRef.value = '/some/unknown/path';
    renderHook(() => useDocumentTitle());
    expect(documentRef.title).toBe('Collecta');
  });

  it('is a no-op on native', () => {
    mockPlatformState.OS = 'ios';
    documentRef.title = 'untouched';
    mockPathnameRef.value = '/settings';
    renderHook(() => useDocumentTitle());
    expect(documentRef.title).toBe('untouched');
  });
});
