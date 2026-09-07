import { normalizeTzPhone } from '../phone';

export class SMSResource {
  constructor(private makeRequest: RequestFn) {}

  async send(params: SendSmsParams, options: SendSmsOptions = {}): Promise<SendSmsResult> {
    const to = options.skipPhoneNormalization ? params.to : normalizeTzPhone(params.to);

    const body: Record<string, unknown> = { to, message: params.message };
    if (params.from) body.from = params.from;

    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    const envelope = await this.makeRequest<{
      message_id: string;
      status: 'sent';
      cost: string;
      credits_used: number;
    }>('POST', '/sms', { body, headers });

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

  async sendMany(messages: SendManyMessage[], options: { rateLimitPerSec?: number } = {}): Promise<BulkSMSResult> {
    const rateLimitPerSec = options.rateLimitPerSec ?? 10.0;
    const delay = rateLimitPerSec > 0 ? 1000 / rateLimitPerSec : 0;
    const result: BulkSMSResult = { results: [], failed: [] };

    for (let i = 0; i < messages.length; i++) {
      const item = messages[i]!;
      try {
        const sent = await this.send(
          { to: item.to, message: item.message, from: item.from },
          { idempotencyKey: item.idempotencyKey }
        );
        result.results.push(sent);
      } catch (err: unknown) {
        result.failed.push({
          index: i,
          to: item.to,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      if (delay && i < messages.length - 1) {
        await sleep(delay);
      }
    }

    return result;
  }

  async bulk(params: { to: string[]; message: string; from?: string }): Promise<BulkSendResult> {
    if (!params.message) {
      throw new Error("Validation error: 'message' is required");
    }
    if (!params.to || params.to.length === 0) {
      throw new Error("Validation error: 'to' must contain at least one recipient");
    }
    if (params.to.length > 100) {
      throw new Error(`Validation error: bulk send is limited to 100 recipients, got ${params.to.length}`);
    }

    const normalizedTo = params.to.map((n) => normalizeTzPhone(n));
    const body: Record<string, unknown> = { to: normalizedTo, message: params.message };
    if (params.from) body.from = params.from;

    const envelope = await this.makeRequest<{
      total: number;
      sent: number;
      failed: number;
      results: Array<{
        to: string;
        status: string;
        message_id?: string;
        credits_used?: number;
        error?: string;
      }>;
    }>('POST', '/sms/bulk', { body });

    const d = envelope.data!;
    return {
      total: d.total,
      sent: d.sent,
      failed: d.failed,
      results: d.results.map((r) => ({
        to: r.to,
        status: r.status,
        messageId: r.message_id ?? null,
        creditsUsed: r.credits_used ?? null,
        error: r.error ?? null,
      })),
    };
  }

  async logs(query: SmsLogsQuery = {}): Promise<MessageLogListResponse> {
    const qs = buildQuery({
      page: query.page,
      per_page: query.perPage,
      status: query.status,
      search: query.search,
      date_from: query.dateFrom,
    });

    const envelope = await this.makeRequest<{
      items: Array<{
        id: string;
        account_id: string;
        to_phone: string;
        from_id: string | null;
        message: string;
        status: string;
        sms_parts: number;
        credits_used: number;
        credits_reserved: number;
        is_international: boolean;
        created_at: string | null;
        updated_at: string | null;
        sent_at: string | null;
        delivered_at: string | null;
        platform?: string;
      }>;
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>('GET', `/sms/logs${qs}`, { useApiKey: true });

    const d = envelope.data!;
    return {
      items: d.items.map((i) => ({
        id: i.id,
        accountId: i.account_id,
        toPhone: i.to_phone,
        fromId: i.from_id ?? null,
        message: i.message,
        status: i.status as MessageLog['status'],
        smsParts: i.sms_parts,
        creditsUsed: i.credits_used,
        creditsReserved: i.credits_reserved,
        isInternational: i.is_international,
        createdAt: i.created_at ?? null,
        updatedAt: i.updated_at ?? null,
        sentAt: i.sent_at ?? null,
        deliveredAt: i.delivered_at ?? null,
        platform: i.platform ?? null,
      })),
      total: d.total,
      page: d.page,
      perPage: d.per_page,
      totalPages: d.total_pages,
    };
  }

  async logsJwt(jwtToken: string, query: SmsLogsQuery = {}): Promise<MessageLogListResponse> {
    const qs = buildQuery({
      page: query.page,
      per_page: query.perPage,
      status: query.status,
    });

    const envelope = await this.makeRequest<{
      items: Array<{
        id: string;
        account_id: string;
        to_phone: string;
        from_id: string | null;
        message: string;
        status: string;
        sms_parts: number;
        credits_used: number;
        sent_at: string | null;
        delivered_at: string | null;
        created_at: string;
      }>;
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
      }>('GET', `/sms/logs${qs}`, { useApiKey: false, useJwt: jwtToken });

    const d = envelope.data!;
    return {
      items: d.items.map((i) => ({
        id: i.id,
        accountId: i.account_id,
        toPhone: i.to_phone,
        fromId: i.from_id ?? null,
        message: i.message,
        status: i.status as MessageLog['status'],
        smsParts: i.sms_parts,
        creditsUsed: i.credits_used,
        creditsReserved: 0,
        isInternational: false,
        createdAt: i.created_at,
        updatedAt: null,
        sentAt: i.sent_at ?? null,
        deliveredAt: i.delivered_at ?? null,
        platform: null,
      })),
      total: d.total,
      page: d.page,
      perPage: d.per_page,
      totalPages: d.total_pages,
    };
  }
}

export interface SendSmsParams {
  to: string;
  message: string;
  from?: string;
}

export interface SendSmsOptions {
  idempotencyKey?: string;
  skipPhoneNormalization?: boolean;
}

export interface SendSmsResult {
  messageId: string;
  status: 'sent';
  cost: string;
  creditsUsed: number;
  requestId: string;
  timestamp: string;
}

export interface SendManyMessage {
  to: string;
  message: string;
  from?: string;
  idempotencyKey?: string;
}

export interface BulkSMSRecipient {
  to: string;
  status: string;
  messageId: string | null;
  creditsUsed: number | null;
  error: string | null;
}

export interface BulkSMSResult {
  results: Array<{
    messageId: string;
    status: 'sent';
    cost: string;
    creditsUsed: number;
    requestId: string;
    timestamp: string;
  }>;
  failed: Array<{
    index: number;
    to: string;
    error: string;
  }>;
}

export interface BulkSendRecipient {
  to: string;
  status: string;
  messageId: string | null;
  creditsUsed: number | null;
  error: string | null;
}

export interface BulkSendResult {
  total: number;
  sent: number;
  failed: number;
  results: BulkSendRecipient[];
}

export type MessageLogStatus = 'sent' | 'delivered' | 'failed' | 'pending';

export interface MessageLog {
  id: string;
  accountId: string;
  toPhone: string;
  fromId: string | null;
  message: string;
  status: MessageLogStatus;
  smsParts: number;
  creditsUsed: number;
  creditsReserved: number;
  isInternational: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  platform: string | null;
}

export interface MessageLogListResponse {
  items: MessageLog[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface SmsLogsQuery {
  page?: number;
  perPage?: number;
  status?: MessageLogStatus;
  search?: string;
  dateFrom?: string;
}

export interface RequestFnOptions {
  body?: unknown;
  headers?: Record<string, string>;
  useApiKey?: boolean;
  useJwt?: string;
}

export type RequestFn = <T = unknown>(
  method: 'GET' | 'POST',
  path: string,
  opts?: RequestFnOptions
) => Promise<{ success: boolean; data?: T; error?: { code: string; message: string }; request_id?: string; timestamp?: string }>;

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
