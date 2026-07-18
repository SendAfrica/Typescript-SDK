export interface SendSmsParams {
  /** Recipient phone number — local (07...), +255..., or 255... */
  to: string;
  /** The SMS text to send. */
  message: string;
  /**
   * Custom sender ID shown on the recipient's phone. Must already be
   * approved by SendAfrica, or the carrier silently falls back to the
   * default `SendAfrika` sender ID and the message still sends.
   */
  from?: string;
}

export interface SendSmsOptions {
  /**
   * Reuse the same key across retries of the *same* logical send so a
   * dropped connection can't cause a duplicate message. Generate a new
   * key per distinct message.
   */
  idempotencyKey?: string;
  /**
   * Skip client-side phone normalization/validation and send `to` as-is.
   * Useful if you've already validated numbers upstream.
   */
  skipPhoneNormalization?: boolean;
}

export interface SendSmsResult {
  messageId: string;
  status: 'sent';
  /** Carrier cost string from Africa's Talking, e.g. "KES 1.00". */
  cost: string;
  creditsUsed: number;
  requestId: string;
  timestamp: string;
}

export interface BalanceResult {
  accountId: string;
  /** Number of SMS credits available. */
  balance: number;
}

export type VoucherProvider = 'snippe';

export interface VoucherRateTier {
  /** Upper bound of this tier in TZS. `0` marks the unbounded top tier. */
  maxAmountTzs: number;
  rateTzsPerCredit: number;
}

export interface VoucherRateResult {
  minAmountTzs: number;
  tiers: VoucherRateTier[];
}

export interface CreateVoucherParams {
  /** Only "snippe" (Tanzania mobile money) is exposed through the public API. */
  provider: VoucherProvider;
  /** Amount in TZS, at or above `minAmountTzs` from {@link VoucherRateResult}. */
  amount: number;
}

export type VoucherStatus = 'pending' | 'confirmed' | 'failed' | (string & {});

export interface VoucherResult {
  id: string;
  provider: VoucherProvider;
  /**
   * The account's own verified phone number that will be charged.
   * Mobile-money top-ups always use this — there is no way to supply a
   * different phone number through the API.
   */
  phone: string;
  amount: number;
  creditAmount: number;
  currency: string;
  status: VoucherStatus;
  packageId: string | null;
  createdAt: string;
}

export type MessageStatus = 'sent' | 'delivered' | 'failed';

export interface MessageLogEntry {
  id: string;
  toPhone: string;
  fromId: string | null;
  message: string;
  status: MessageStatus;
  smsParts: number;
  creditsUsed: number;
  sentAt: string;
  deliveredAt: string | null;
  createdAt: string;
}

export interface MessageLogsQuery {
  page?: number;
  perPage?: number;
  status?: MessageStatus;
}

export interface MessageLogsResult {
  items: MessageLogEntry[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface CreditHistoryQuery {
  page?: number;
  perPage?: number;
}
