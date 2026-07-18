import { InvalidPhoneNumberError } from './errors';

/** Valid Tanzania mobile prefixes accepted by the SendAfrica API. */
export const TZ_MOBILE_PREFIXES = [
  '071',
  '072',
  '073',
  '074',
  '075',
  '076',
  '077',
  '078',
] as const;

/**
 * Normalizes a Tanzania mobile number to E.164 format (`+255XXXXXXXXX`).
 *
 * Accepts:
 *  - Local:                 0712345678
 *  - International with +:  +255712345678
 *  - International without +: 255712345678
 *
 * Throws {@link InvalidPhoneNumberError} for anything else, including
 * numbers from other countries.
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

  if (!national) {
    throw new InvalidPhoneNumberError(input);
  }

  const prefix = `0${national.slice(0, 2)}`;
  if (!(TZ_MOBILE_PREFIXES as readonly string[]).includes(prefix)) {
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
