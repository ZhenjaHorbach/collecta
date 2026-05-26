// auth.service is a thin façade over supabase.auth + a hand-rolled OAuth
// fragment parse. Tests pin: each method calls the right Supabase method
// with the right args, errors propagate, and the OAuth flow extracts both
// tokens from the redirect URL fragment.

/* eslint-disable import/first */
const mockSignUp = jest.fn();
const mockSignIn = jest.fn();
const mockVerifyOtp = jest.fn();
const mockSignInOAuth = jest.fn();
const mockSetSession = jest.fn();
const mockSignOut = jest.fn();
const mockOpenAuthSessionAsync = jest.fn();

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `collecta://app/${path}`,
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: () => undefined,
  openAuthSessionAsync: (...args: unknown[]) => mockOpenAuthSessionAsync(...args),
}));

jest.mock('../supabase.service', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInOAuth(...args),
      setSession: (...args: unknown[]) => mockSetSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));

import {
  EmailAlreadyRegisteredError,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  verifyEmailOtp,
} from '../auth.service';
/* eslint-enable import/first */

beforeEach(() => {
  mockSignUp.mockReset();
  mockSignIn.mockReset();
  mockVerifyOtp.mockReset();
  mockSignInOAuth.mockReset();
  mockSetSession.mockReset();
  mockSignOut.mockReset();
  mockOpenAuthSessionAsync.mockReset();
});

describe('signUpWithEmail', () => {
  it('passes email + password and the auth/callback redirect URL', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'u', identities: [{ id: 'i1' }] } },
      error: null,
    });
    await signUpWithEmail('a@b.co', 'pw');
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'pw',
      options: { emailRedirectTo: 'collecta://app/auth/callback' },
    });
  });

  it('throws on error', async () => {
    mockSignUp.mockResolvedValue({ data: null, error: new Error('weak password') });
    await expect(signUpWithEmail('a@b.co', 'x')).rejects.toThrow('weak password');
  });

  it('throws EmailAlreadyRegisteredError when Supabase returns user with empty identities', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'u', identities: [] }, session: null },
      error: null,
    });
    await expect(signUpWithEmail('used@b.co', 'pw')).rejects.toBeInstanceOf(
      EmailAlreadyRegisteredError
    );
  });
});

describe('signInWithEmail', () => {
  it('forwards email + password', async () => {
    mockSignIn.mockResolvedValue({ data: {}, error: null });
    await signInWithEmail('a@b.co', 'pw');
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'a@b.co', password: 'pw' });
  });
});

describe('verifyEmailOtp', () => {
  it('calls verifyOtp with type=signup', async () => {
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null });
    await verifyEmailOtp('a@b.co', '123456');
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: 'a@b.co',
      token: '123456',
      type: 'signup',
    });
  });
});

describe('signOut', () => {
  it('throws when supabase.signOut errors', async () => {
    mockSignOut.mockResolvedValue({ error: new Error('network') });
    await expect(signOut()).rejects.toThrow('network');
  });

  it('resolves silently on success', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    await expect(signOut()).resolves.toBeUndefined();
  });
});

describe('signInWithGoogle', () => {
  it('throws when no OAuth URL is returned', async () => {
    mockSignInOAuth.mockResolvedValue({ data: null, error: null });
    await expect(signInWithGoogle()).rejects.toThrow('No OAuth URL returned');
  });

  it('throws when the user cancels the browser session', async () => {
    mockSignInOAuth.mockResolvedValue({
      data: { url: 'https://oauth.example/start' },
      error: null,
    });
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'cancel' });
    await expect(signInWithGoogle()).rejects.toThrow('OAuth cancelled');
  });

  it('throws when the redirect URL has no tokens in the fragment', async () => {
    mockSignInOAuth.mockResolvedValue({
      data: { url: 'https://oauth.example/start' },
      error: null,
    });
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'collecta://app/auth/callback#nope',
    });
    await expect(signInWithGoogle()).rejects.toThrow('Missing OAuth tokens');
  });

  it('extracts access + refresh tokens from the fragment and calls setSession', async () => {
    mockSignInOAuth.mockResolvedValue({
      data: { url: 'https://oauth.example/start' },
      error: null,
    });
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'collecta://app/auth/callback#access_token=AAA&refresh_token=RRR&expires_in=3600',
    });
    mockSetSession.mockResolvedValue({ data: { session: { user: { id: 'u' } } }, error: null });
    const out = await signInWithGoogle();
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'AAA',
      refresh_token: 'RRR',
    });
    expect(out).toEqual({ session: { user: { id: 'u' } } });
  });
});
