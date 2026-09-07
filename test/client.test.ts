import { describe, expect, it, vi } from 'vitest';
import { SendAfricaClient } from '../src/client';
import { SendAfricaError } from '../src/errors';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('SendAfricaClient', () => {
  it('sends an SMS via client.sms.send() and normalizes the phone number', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { message_id: 'abc123', status: 'sent', cost: 'KES 1.00', credits_used: 1 },
        request_id: 'req-1',
        timestamp: '2026-06-11T16:24:05Z',
      })
    );

    const client = new SendAfricaClient({ apiKey: 'SA-test', fetch: fetchMock as unknown as typeof fetch });
    const result = await client.sms.send({ to: '0712345678', message: 'Hi' });

    expect(result.messageId).toBe('abc123');
    expect(result.creditsUsed).toBe(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.sendafrica.online/v1/sms');
    expect(init.headers['X-API-Key']).toBe('SA-test');
    expect(init.headers['Authorization']).toBe('Bearer SA-test');
    expect(init.headers['User-Agent']).toBe('sendafrica-node/1.1');
    expect(JSON.parse(init.body)).toEqual({ to: '+255712345678', message: 'Hi' });
  });

  it('sends X-API-Key and Authorization headers on every authenticated request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, data: { account_id: 'acc-1', balance: 5000 } })
    );

    const client = new SendAfricaClient({ apiKey: 'SA-test', fetch: fetchMock as unknown as typeof fetch });
    await client.credits.balance();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['X-API-Key']).toBe('SA-test');
    expect(init.headers['Authorization']).toBe('Bearer SA-test');
  });

  it('throws SendAfricaError with code on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        { success: false, error: { code: 'insufficient_credits', message: 'Not enough credits' } },
        402
      )
    );

    const client = new SendAfricaClient({
      apiKey: 'SA-test',
      fetch: fetchMock as unknown as typeof fetch,
      maxRetries: 0,
    });

    await expect(client.credits.balance()).rejects.toMatchObject({
      code: 'insufficient_credits',
    });
  });

  it('retries on 429 then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ success: false, error: { code: 'rate_limit_exceeded', message: 'slow down' } }, 429)
      )
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: { account_id: 'acc-1', balance: 5000 } })
      );

    const client = new SendAfricaClient({
      apiKey: 'SA-test',
      fetch: fetchMock as unknown as typeof fetch,
      maxRetries: 2,
    });

    const result = await client.credits.balance();
    expect(result.balance).toBe(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sms.logsJwt uses Bearer auth, not X-API-Key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { items: [], total: 0, page: 1, per_page: 25, total_pages: 0 },
      })
    );

    const client = new SendAfricaClient({ apiKey: 'SA-test', fetch: fetchMock as unknown as typeof fetch });
    await client.sms.logsJwt('jwt-token-here');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Authorization']).toBe('Bearer jwt-token-here');
    expect(init.headers['X-API-Key']).toBeUndefined();
  });

  it('sendSms rejects invalid phone numbers before making a network call', async () => {
    const fetchMock = vi.fn();
    const client = new SendAfricaClient({ apiKey: 'SA-test', fetch: fetchMock as unknown as typeof fetch });

    await expect(client.sms.send({ to: '+254712345678', message: 'Hi' })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sms.bulk sends to the /sms/bulk endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          total: 3,
          sent: 2,
          failed: 1,
          results: [
            { to: '+255711111111', status: 'sent', message_id: 'SA-001', credits_used: 1 },
            { to: '+255722222222', status: 'sent', message_id: 'SA-002', credits_used: 1 },
            { to: '+255733333333', status: 'failed', error: 'Invalid phone' },
          ],
        },
      })
    );

    const client = new SendAfricaClient({ apiKey: 'SA-test', fetch: fetchMock as unknown as typeof fetch });
    const result = await client.sms.bulk({ to: ['0711111111', '0722222222', '0733333333'], message: 'Hello bulk!' });

    expect(result.total).toBe(3);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(1);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.sendafrica.online/v1/sms/bulk');
  });

  it('rates.list fetches the rate card', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: [
          { name: 'Tanzania', iso2: 'TZ', dial_code: '+255', rate_tzs: 35 },
          { name: 'Namibia', iso2: 'NA', dial_code: '+264', rate_tzs: 112 },
        ],
      })
    );

    const client = new SendAfricaClient({ apiKey: 'SA-test', fetch: fetchMock as unknown as typeof fetch });
    const rates = await client.rates.list();

    expect(rates.length).toBe(2);
    expect(rates[0]!.name).toBe('Tanzania');
    expect(rates[0]!.rateTzs).toBe(35);
    expect(rates[1]!.providerBulkSms).toBeNull();
  });

  it('senderIds.create submits a registration request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          id: 'sid-123',
          name: 'MYBRAND',
          country: 'TZ',
          purpose: 'Transactional',
          sample_message: 'Your code is 123456.',
          status: 'pending',
          is_usable: false,
          rejection_reason: null,
          submitted_at: null,
          created_at: '2026-09-03T12:00:00Z',
          updated_at: '2026-09-03T12:00:00Z',
        },
        status: 201,
      })
    );

    const client = new SendAfricaClient({ apiKey: 'SA-test', fetch: fetchMock as unknown as typeof fetch });
    const sid = await client.senderIds.create({
      name: 'MYBRAND',
      country: 'TZ',
      purpose: 'Transactional',
      sampleMessage: 'Your code is 123456.',
    });

    expect(sid.id).toBe('sid-123');
    expect(sid.status).toBe('pending');
    expect(sid.isUsable).toBe(false);
  });
});
