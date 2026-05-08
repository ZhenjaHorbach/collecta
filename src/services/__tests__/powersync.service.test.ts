// SupabaseConnector.fetchCredentials guards against an unauthenticated user
// (no session → throw). uploadData is a TODO stub today; the test pins it
// being a no-op so future code that depends on the contract knows when it
// changes.

/* eslint-disable import/first */
const mockGetSession = jest.fn();

jest.mock('../supabase.service', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// PowerSync exports types + an interface; the connector implements it. Use
// a minimal stub so jest doesn't have to load the native PowerSync runtime.
jest.mock('@powersync/react-native', () => ({}));

import { SupabaseConnector } from '../powersync.service';
/* eslint-enable import/first */

beforeEach(() => mockGetSession.mockReset());

describe('SupabaseConnector', () => {
  it('throws when there is no active session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const connector = new SupabaseConnector();
    await expect(connector.fetchCredentials()).rejects.toThrow('No active session');
  });

  it('returns the PowerSync URL and the session access token', async () => {
    process.env.EXPO_PUBLIC_POWERSYNC_URL = 'https://stub.powersync.dev';
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'AAA', refresh_token: 'RRR' } },
    });
    const connector = new SupabaseConnector();
    const creds = await connector.fetchCredentials();
    expect(creds).toEqual({
      endpoint: 'https://stub.powersync.dev',
      token: 'AAA',
    });
  });

  it('uploadData is a no-op (offline write-back not yet implemented)', async () => {
    const connector = new SupabaseConnector();

    await expect(connector.uploadData(undefined as any)).resolves.toBeUndefined();
  });
});
