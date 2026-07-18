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
  it('sends an SMS and normalizes the phone number', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { message_id: 'abc123', status: 'sent', cost: 'KES 1.00', credits_used: 1 },
        request_id: 'req-1',
        timestamp: '2026-06-11T16:24:05Z',
      })
    );

    const client = new SendAfricaClient({ apiKey: 'SA-test', fetch: fetchMock as unknown as typeof fetch });
    const result = await client.sendSms({ to: '0712345678', message: 'Hi' });

    expect(result.messageId).toBe('abc123');
    expect(result.creditsUsed).toBe(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.sendafrica.online/v1/sms/');
    expect(init.headers['X-API-Key']).toBe('SA-test');
    expect(JSON.parse(init.body)).toEqual({ to: '+255712345678', message: 'Hi' });
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

    await expect(client.getBalance()).rejects.toMatchObject({
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

    const result = await client.getBalance();
    expect(result.balance).toBe(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('getMessageLogs uses Bearer auth, not X-API-Key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { items: [], total: 0, page: 1, per_page: 25, total_pages: 0 },
      })
    );

    const client = new SendAfricaClient({ apiKey: 'SA-test', fetch: fetchMock as unknown as typeof fetch });
    await client.getMessageLogs('jwt-token-here');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Authorization']).toBe('Bearer jwt-token-here');
    expect(init.headers['X-API-Key']).toBeUndefined();
  });

  it('rejects invalid phone numbers before making a network call', async () => {
    const fetchMock = vi.fn();
    const client = new SendAfricaClient({ apiKey: 'SA-test', fetch: fetchMock as unknown as typeof fetch });

    await expect(client.sendSms({ to: '+254712345678', message: 'Hi' })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
