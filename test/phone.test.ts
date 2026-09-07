import { describe, expect, it } from 'vitest';
import { InvalidPhoneNumberError } from '../src/errors';
import { isValidTzPhone, normalizeTzPhone } from '../src/phone';

describe('normalizeTzPhone', () => {
  it('normalizes local format', () => {
    expect(normalizeTzPhone('0712345678')).toBe('+255712345678');
  });

  it('accepts international with +', () => {
    expect(normalizeTzPhone('+255712345678')).toBe('+255712345678');
  });

  it('accepts international without +', () => {
    expect(normalizeTzPhone('255712345678')).toBe('+255712345678');
  });

  it('strips spaces and dashes', () => {
    expect(normalizeTzPhone('071 234 5678')).toBe('+255712345678');
    expect(normalizeTzPhone('071-234-5678')).toBe('+255712345678');
  });

  it('rejects other countries', () => {
    expect(() => normalizeTzPhone('+254712345678')).toThrow(InvalidPhoneNumberError);
  });

  it('accepts 06x prefixes (Halotel, Airtel)', () => {
    expect(normalizeTzPhone('0682345678')).toBe('+255682345678');
    expect(normalizeTzPhone('0692345678')).toBe('+255692345678');
  });

  it('rejects invalid prefixes', () => {
    expect(() => normalizeTzPhone('0501234567')).toThrow(InvalidPhoneNumberError);
    expect(() => normalizeTzPhone('0801234567')).toThrow(InvalidPhoneNumberError);
  });

  it('rejects garbage input', () => {
    expect(() => normalizeTzPhone('not-a-number')).toThrow(InvalidPhoneNumberError);
  });

  it('isValidTzPhone returns booleans instead of throwing', () => {
    expect(isValidTzPhone('0712345678')).toBe(true);
    expect(isValidTzPhone('+254712345678')).toBe(false);
  });
});
