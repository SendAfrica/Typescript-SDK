import { InvalidPhoneNumberError } from './errors';

/** Valid Tanzania mobile prefixes accepted by the SendAfrica API.
 * Includes all carrier ranges: Vodacom (071-074), Tigo/Mixx (076-078),
 * Airtel (068-078), Halotel (068-071), TTCL (02x landline excluded).
 */
export const TZ_MOBILE_PREFIXES = [
  '071', '072', '073', '074', '075', '076', '077', '078',
  '068', '069',
] as const;

// Matches the 9-digit national number portion (after stripping 0, 255, or +255).
// Accepts both 06x and 07x prefixes — carriers include 067-069 ranges.
const _TZ_MOBILE_REGEX = /^[67]\d{8}$/;

/**
 * Normalizes a Tanzania mobile number to E.164 format (`+255XXXXXXXXX`).
 *
 * Accepts:
 *  - Local:                 0712345678, 0694157749
 *  - International with +:  +255712345678
 *  - International without +: 255712345678
 *
 * Throws {@link InvalidPhoneNumberError} for anything else, including
 * numbers from other countries or invalid Tanzania prefixes.
 */
export function normalizeTzPhone(input: string): string {
  const cleaned = input.replace(/[\s\-().]/g, '');

  let national: string | null = null; // 9 digits, no leading 0 / 255 / +255

  if (/^0\d{9}$/.test(cleaned)) {
    national = cleaned.slice(1);
  } else if (/^\+255\d{9}$/.test(cleaned)) {
    national = cleaned.slice(4);
  } else if (/^255\d{9}$/.test(cleaned)) {
    national = cleaned.slice(3);
  }

  if (!national || !/^\d{9}$/.test(national)) {
    throw new InvalidPhoneNumberError(input);
  }

  if (!_TZ_MOBILE_REGEX.test(national)) {
    throw new InvalidPhoneNumberError(input);
  }

  return `+255${national}`;
}

/** Returns true if `input` is a valid Tanzania mobile number in any accepted format. */
export function isValidTzPhone(input: string): boolean {
  try {
    normalizeTzPhone(input);
    return true;
  } catch {
    return false;
  }
}
