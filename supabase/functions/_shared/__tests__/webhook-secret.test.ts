// Webhook secret gate for on-user-created (and future DB webhooks). The
// failure that matters: anything other than an exact match — including an
// unset secret on the server — must be rejected.

import { isValidWebhookSecret } from '../webhook-secret';

describe('isValidWebhookSecret', () => {
  it('accepts an exact match', () => {
    expect(isValidWebhookSecret('s3cret-value', 's3cret-value')).toBe(true);
  });

  it.each([
    ['wrong value, same length', 's3cret-valuX', 's3cret-value'],
    ['prefix of the secret', 's3cret', 's3cret-value'],
    ['secret plus extra characters', 's3cret-value-and-more', 's3cret-value'],
    ['different case', 'S3CRET-VALUE', 's3cret-value'],
  ])('rejects %s', (_label, provided, expected) => {
    expect(isValidWebhookSecret(provided, expected)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(isValidWebhookSecret(null, 's3cret-value')).toBe(false);
    expect(isValidWebhookSecret(undefined, 's3cret-value')).toBe(false);
    expect(isValidWebhookSecret('', 's3cret-value')).toBe(false);
  });

  it('fails closed when the server secret is not configured', () => {
    expect(isValidWebhookSecret('anything', undefined)).toBe(false);
    expect(isValidWebhookSecret('', '')).toBe(false);
    expect(isValidWebhookSecret(null, null)).toBe(false);
  });
});
