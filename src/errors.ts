/**
 * Thrown whenever the SendAfrica API responds with `success: false`.
 * Mirrors the API's error envelope: `{ error: { code, message } }`.
 */
export interface SendAfricaErrorPayload {
  code: string;
  message: string;
  requestId?: string;
  httpStatus?: number;
}

export class SendAfricaError extends Error {
  /** Machine-readable error code, e.g. "insufficient_credits", "invalid_phone". */
  readonly code: string;
  /** The `request_id` echoed by the API, useful when contacting support. */
  readonly requestId?: string;
  /** HTTP status code of the response, when available. */
  readonly httpStatus?: number;

  constructor(payload: SendAfricaErrorPayload) {
    super(`[${payload.code}] ${payload.message}`);
    this.name = 'SendAfricaError';
    this.code = payload.code;
    this.requestId = payload.requestId;
    this.httpStatus = payload.httpStatus;
    Object.setPrototypeOf(this, SendAfricaError.prototype);
  }

  /** True for `402 insufficient_credits`. */
  get isInsufficientCredits(): boolean {
    return this.code === 'insufficient_credits';
  }

  /** True for `429 rate_limit_exceeded`. */
  get isRateLimited(): boolean {
    return this.code === 'rate_limit_exceeded';
  }

  /** True for `401 unauthorized` (missing/invalid/revoked key). */
  get isUnauthorized(): boolean {
    return this.code === 'unauthorized';
  }
}

/** Thrown for network failures, timeouts, or unparsable responses. */
export class SendAfricaNetworkError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SendAfricaNetworkError';
    this.cause = cause;
    Object.setPrototypeOf(this, SendAfricaNetworkError.prototype);
  }
}

/** Thrown by phone-number helpers when a number isn't a valid Tanzania mobile number. */
export class InvalidPhoneNumberError extends Error {
  constructor(input: string) {
    super(
      `"${input}" is not a valid Tanzania mobile number. ` +
        `Expected local (07XXXXXXXX), +255XXXXXXXXX, or 255XXXXXXXXX format ` +
        `with a valid prefix (071–078).`
    );
    this.name = 'InvalidPhoneNumberError';
    Object.setPrototypeOf(this, InvalidPhoneNumberError.prototype);
  }
}
