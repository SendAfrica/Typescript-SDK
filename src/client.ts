import { SMSResource } from './resources/sms';
import { RatesResource } from './resources/rates';
import { SenderIDsResource } from './resources/senderids';
import { CreditsResource } from './resources/credits';
import { PaymentsResource } from './resources/payments';
import { SendAfricaError, SendAfricaNetworkError } from './errors';

const DEFAULT_BASE_URL = 'https://api.sendafrica.online/v1';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 2;

export interface SendAfricaClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
}

interface RawEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  request_id?: string;
  timestamp?: string;
}

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  useApiKey?: boolean;
  useJwt?: string;
}

export class SendAfricaClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;

  readonly sms: SMSResource;
  readonly rates: RatesResource;
  readonly senderIds: SenderIDsResource;
  readonly credits: CreditsResource;
  readonly payments: PaymentsResource;

  constructor(config: SendAfricaClientConfig) {
    if (!config.apiKey) {
      throw new Error('SendAfricaClient: `apiKey` is required.');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.userAgent = 'sendafrica-node/1.1';

    const fetchImpl = config.fetch ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new Error(
        'SendAfricaClient: no global `fetch` found. On Node < 18, pass `{ fetch }` ' +
          'explicitly (e.g. from the "node-fetch" package).'
      );
    }
    this.fetchImpl = fetchImpl;

    const makeRequest = this.request.bind(this);
    this.sms = new SMSResource(makeRequest);
    this.rates = new RatesResource(makeRequest);
    this.senderIds = new SenderIDsResource(makeRequest);
    this.credits = new CreditsResource(makeRequest);
    this.payments = new PaymentsResource(makeRequest);
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    opts: RequestOptions = {}
  ): Promise<RawEnvelope<T>> {
    const url = `${this.baseUrl}${path}`;
    const useApiKey = opts.useApiKey ?? true;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': this.userAgent,
      'X-Request-Id': crypto.randomUUID(),
      ...opts.headers,
    };

    if (useApiKey) {
      headers['X-API-Key'] = this.apiKey;
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    } else if (opts.useJwt) {
      headers['Authorization'] = `Bearer ${opts.useJwt}`;
    }

    let attempt = 0;

    for (;;) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      let res: Response;
      try {
        res = await this.fetchImpl(url, {
          method,
          headers,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        if (attempt <= this.maxRetries) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new SendAfricaNetworkError(`Request to ${path} failed: ${(err as Error).message}`, err);
      }
      clearTimeout(timer);

      let json: RawEnvelope<T>;
      try {
        json = (await res.json()) as RawEnvelope<T>;
      } catch (err) {
        throw new SendAfricaNetworkError(`Non-JSON response from ${path} (HTTP ${res.status})`, err);
      }

      if (json.success) return json;

      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt <= this.maxRetries) {
        const retryAfter = res.headers.get('Retry-After');
        if (retryAfter) {
          await sleep(parseFloat(retryAfter) * 1000);
        } else {
          await sleep(backoffMs(attempt));
        }
        continue;
      }

      throw new SendAfricaError({
        code: json.error?.code ?? 'unknown_error',
        message: json.error?.message ?? `Request failed with HTTP ${res.status}`,
        requestId: json.request_id,
        httpStatus: res.status,
      });
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** (attempt - 1), 8000) + Math.random() * 250;
}
