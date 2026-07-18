import { SendAfricaError, SendAfricaNetworkError } from './errors';
import { normalizeTzPhone } from './phone';
import type {
  BalanceResult,
  CreateVoucherParams,
  CreditHistoryQuery,
  MessageLogsQuery,
  MessageLogsResult,
  SendSmsOptions,
  SendSmsParams,
  SendSmsResult,
  VoucherRateResult,
  VoucherResult,
} from './types';

const DEFAULT_BASE_URL = 'https://api.sendafrica.online';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 2;

export interface SendAfricaClientConfig {
  /** Your SendAfrica API key (starts with `SA-`). */
  apiKey: string;
  /** Override the API base URL. Defaults to https://api.sendafrica.online */
  baseUrl?: string;
  /** Per-request timeout in ms. Defaults to 15000. */
  timeoutMs?: number;
  /**
   * How many times to retry on `429 rate_limit_exceeded`, `5xx`, or a
   * network failure, using exponential backoff. Defaults to 2. Set to 0
   * to disable retries entirely.
   */
  maxRetries?: number;
  /** Inject a custom fetch implementation (e.g. for Node < 18, or tests). */
  fetch?: typeof fetch;
}

interface RawEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  request_id?: string;
  timestamp?: string;
}

/**
 * TypeScript client for the SendAfrica Tanzania SMS API.
 *
 * @example
 * ```ts
 * const client = new SendAfricaClient({ apiKey: process.env.SENDAFRICA_API_KEY! });
 * const result = await client.sendSms({ to: '0712345678', message: 'Hello!' });
 * console.log(result.messageId);
 * ```
 */
export class SendAfricaClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(config: SendAfricaClientConfig) {
    if (!config.apiKey) {
      throw new Error('SendAfricaClient: `apiKey` is required.');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;

    const fetchImpl = config.fetch ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new Error(
        'SendAfricaClient: no global `fetch` found. On Node < 18, pass `{ fetch }` ' +
          'explicitly (e.g. from the "node-fetch" package).'
      );
    }
    this.fetchImpl = fetchImpl;
  }

  /**
   * Sends an SMS. The `to` number is normalized to `+255XXXXXXXXX` and
   * validated client-side before the request is made (disable with
   * `options.skipPhoneNormalization`).
   */
  async sendSms(params: SendSmsParams, options: SendSmsOptions = {}): Promise<SendSmsResult> {
    const to = options.skipPhoneNormalization ? params.to : normalizeTzPhone(params.to);

    const body: Record<string, unknown> = { to, message: params.message };
    if (params.from) body.from = params.from;

    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    const envelope = await this.request<{
      message_id: string;
      status: 'sent';
      cost: string;
      credits_used: number;
    }>('POST', '/v1/sms/', { body, headers });

    const d = envelope.data!;
    return {
      messageId: d.message_id,
      status: d.status,
      cost: d.cost,
      creditsUsed: d.credits_used,
      requestId: envelope.request_id ?? '',
      timestamp: envelope.timestamp ?? '',
    };
  }

  /** Returns the current SMS credit balance for this account. */
  async getBalance(): Promise<BalanceResult> {
    const envelope = await this.request<{ account_id: string; balance: number }>(
      'GET',
      '/v1/credits/balance'
    );
    const d = envelope.data!;
    return { accountId: d.account_id, balance: d.balance };
  }

  /** Fetches the current top-up pricing tiers, for showing a live estimate. */
  async getVoucherRate(): Promise<VoucherRateResult> {
    const envelope = await this.request<{
      min_amount_tzs: number;
      tiers: { max_amount_tzs: number; rate_tzs_per_credit: number }[];
    }>('GET', '/v1/vouchers/rate');

    const d = envelope.data!;
    return {
      minAmountTzs: d.min_amount_tzs,
      tiers: d.tiers.map((t) => ({
        maxAmountTzs: t.max_amount_tzs,
        rateTzsPerCredit: t.rate_tzs_per_credit,
      })),
    };
  }

  /**
   * Initiates a mobile-money top-up. The payment always charges the
   * account's own verified phone number — there is no way to specify a
   * different one. The returned voucher starts `pending`; poll
   * {@link getBalance} or watch for a confirmation notification, since
   * there is no status-poll endpoint for vouchers.
   */
  async createVoucher(
    params: CreateVoucherParams,
    options: { idempotencyKey?: string } = {}
  ): Promise<VoucherResult> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    const envelope = await this.request<{
      id: string;
      provider: string;
      phone: string;
      amount: number;
      credit_amount: number;
      currency: string;
      status: string;
      package_id: string | null;
      created_at: string;
    }>('POST', '/v1/vouchers/', { body: params, headers });

    const d = envelope.data!;
    return {
      id: d.id,
      provider: d.provider as VoucherResult['provider'],
      phone: d.phone,
      amount: d.amount,
      creditAmount: d.credit_amount,
      currency: d.currency,
      status: d.status,
      packageId: d.package_id,
      createdAt: d.created_at,
    };
  }

  /** Returns raw credit transaction history for this account. */
  async getCreditHistory(query: CreditHistoryQuery = {}): Promise<unknown> {
    const qs = buildQuery({ page: query.page, per_page: query.perPage });
    const envelope = await this.request('GET', `/v1/credits/history${qs}`);
    return envelope.data;
  }

  /**
   * Fetches message logs. **Requires a JWT (dashboard login) token, not
   * the API key** — pass it explicitly, it is never combined with
   * `X-API-Key` on the same request.
   */
  async getMessageLogs(jwtToken: string, query: MessageLogsQuery = {}): Promise<MessageLogsResult> {
    const qs = buildQuery({ page: query.page, per_page: query.perPage, status: query.status });

    const envelope = await this.request<{
      items: Array<{
        id: string;
        to_phone: string;
        from_id: string | null;
        message: string;
        status: 'sent' | 'delivered' | 'failed';
        sms_parts: number;
        credits_used: number;
        sent_at: string;
        delivered_at: string | null;
        created_at: string;
      }>;
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>('GET', `/v1/sms/logs${qs}`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
      useApiKey: false,
    });

    const d = envelope.data!;
    return {
      items: d.items.map((i) => ({
        id: i.id,
        toPhone: i.to_phone,
        fromId: i.from_id ?? null,
        message: i.message,
        status: i.status,
        smsParts: i.sms_parts,
        creditsUsed: i.credits_used,
        sentAt: i.sent_at,
        deliveredAt: i.delivered_at ?? null,
        createdAt: i.created_at,
      })),
      total: d.total,
      page: d.page,
      perPage: d.per_page,
      totalPages: d.total_pages,
    };
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    opts: { body?: unknown; headers?: Record<string, string>; useApiKey?: boolean } = {}
  ): Promise<RawEnvelope<T>> {
    const url = `${this.baseUrl}${path}`;
    const useApiKey = opts.useApiKey ?? true;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...opts.headers,
    };
    if (useApiKey) headers['X-API-Key'] = this.apiKey;

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
        await sleep(backoffMs(attempt));
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

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** (attempt - 1), 8000) + Math.random() * 250;
}
