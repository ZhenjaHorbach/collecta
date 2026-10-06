// ai-calls: Node-side cost tracking for the cron generators. Pin the row
// shape (must match the `ai_calls` columns from migration 015 and the Deno
// copy in supabase/functions/_shared/anthropic-usage.ts) and the
// best-effort contract — a logging failure never fails the paid run.

import type { SupabaseClient } from '@supabase/supabase-js';

import { logAiCall, logAiCallFromEnv } from '../ai-calls';

const mockCreateClient = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

const USAGE = {
  input_tokens: 100,
  output_tokens: 20,
  cache_read_tokens: 80,
  cache_creation_tokens: 5,
};

function stubClient(insert: jest.Mock): { client: SupabaseClient; from: jest.Mock } {
  const from = jest.fn(() => ({ insert }));
  return { client: { from } as unknown as SupabaseClient, from };
}

describe('logAiCall', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('inserts the normalized usage row into ai_calls', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    const { client, from } = stubClient(insert);

    await logAiCall(client, 'cron:generate-collection', 'claude-haiku-4-5-20251001', USAGE, {
      source: 'cron',
    });

    expect(from).toHaveBeenCalledWith('ai_calls');
    expect(insert).toHaveBeenCalledWith({
      kind: 'cron:generate-collection',
      model: 'claude-haiku-4-5-20251001',
      input_tokens: 100,
      output_tokens: 20,
      cache_read_tokens: 80,
      cache_creation_tokens: 5,
      metadata: { source: 'cron' },
    });
  });

  it('does not throw when the insert returns an error or rejects', async () => {
    const failing = stubClient(jest.fn().mockResolvedValue({ error: { message: 'denied' } }));
    await expect(logAiCall(failing.client, 'k', 'm', USAGE)).resolves.toBeUndefined();

    const throwing = stubClient(jest.fn().mockRejectedValue(new Error('network')));
    await expect(logAiCall(throwing.client, 'k', 'm', USAGE)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});

describe('logAiCallFromEnv', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    mockCreateClient.mockReset();
    jest.restoreAllMocks();
  });

  it('skips without creating a client when the service role key is missing', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await logAiCallFromEnv('cron:generate-achievement', 'm', USAGE);

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it('creates a service-role client and inserts when env is set', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockCreateClient.mockReturnValue(stubClient(insert).client);
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';

    await logAiCallFromEnv('cron:generate-achievement', 'm', USAGE);

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-test'
    );
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
