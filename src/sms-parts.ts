export type SmsEncoding = 'GSM-7' | 'UCS-2';

export interface SmsPartInfo {
  /** Which encoding the message will be sent as. */
  encoding: SmsEncoding;
  /** Character length of the message. */
  length: number;
  /** Number of SMS parts the message will be split into. */
  parts: number;
  /** Credits SendAfrica will deduct for this message (1 per part). */
  creditsRequired: number;
}

// GSM 7-bit default alphabet (basic character set). Any character outside
// this set forces UCS-2 (Unicode) encoding, which has a lower per-part limit.
const GSM7_REGEX =
  /^[\x00-\x7F\u00C0-\u00C6\u00C8-\u00CF\u00D1-\u00D6\u00D8-\u00DD\u00DF-\u00E6\u00E8-\u00EF\u00F1-\u00F6\u00F8-\u00FD\u00FF\u20AC\u0391-\u03A9\u03B1-\u03C9]*$/;

/** Detects whether a message will be sent as GSM-7 or UCS-2. */
export function detectEncoding(message: string): SmsEncoding {
  return GSM7_REGEX.test(message) ? 'GSM-7' : 'UCS-2';
}

/**
 * Computes the SMS encoding, part count, and credits a message will use,
 * following the same rules as the SendAfrica billing engine:
 *
 * GSM-7: 1–160 chars = 1 part, then 153 chars/part.
 * UCS-2: 1–70 chars  = 1 part, then 67 chars/part.
 */
export function getSmsPartInfo(message: string): SmsPartInfo {
  const encoding = detectEncoding(message);
  const singleLimit = encoding === 'GSM-7' ? 160 : 70;
  const partLimit = encoding === 'GSM-7' ? 153 : 67;
  const length = message.length;

  const parts = length <= singleLimit ? 1 : Math.ceil(length / partLimit);

  return { encoding, length, parts, creditsRequired: parts };
}

/** Convenience shortcut for {@link getSmsPartInfo}(message).parts. */
export function countSmsParts(message: string): number {
  return getSmsPartInfo(message).parts;
}
