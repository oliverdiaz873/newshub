import { createHash } from 'node:crypto';
import { verifyWebhookSignature, webhookSignature } from './syndication.service';

describe('webhookSignature', () => {
  it('signs the raw body with the key and verifies round-trip', () => {
    const secretHex = createHash('sha256').update('displayed-once').digest('hex');
    const rawBody = JSON.stringify({ event: 'published', id: 'abc' });
    const signature = webhookSignature(secretHex, rawBody);
    expect(signature.startsWith('sha256=')).toBe(true);
    expect(verifyWebhookSignature(secretHex, rawBody, signature)).toBe(true);
  });

  it('rejects tampered bodies and wrong secrets', () => {
    const secretHex = createHash('sha256').update('displayed-once').digest('hex');
    const rawBody = JSON.stringify({ event: 'published', id: 'abc' });
    const signature = webhookSignature(secretHex, rawBody);
    expect(verifyWebhookSignature(secretHex, JSON.stringify({ event: 'published', id: 'xyz' }), signature)).toBe(false);
    expect(verifyWebhookSignature(createHash('sha256').update('other').digest('hex'), rawBody, signature)).toBe(false);
    expect(verifyWebhookSignature(secretHex, rawBody, 'sha256=deadbeef')).toBe(false);
  });
});
