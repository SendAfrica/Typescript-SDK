import { describe, expect, it } from 'vitest';
import { detectEncoding, getSmsPartInfo } from '../src/sms-parts';

describe('sms-parts', () => {
  it('detects GSM-7 for plain ASCII', () => {
    expect(detectEncoding('Hello, your order is ready.')).toBe('GSM-7');
  });

  it('detects UCS-2 for emoji and Swahili-specific characters', () => {
    expect(detectEncoding('Habari 😊 Bei yako ni 5000 TZS')).toBe('UCS-2');
  });

  it('detects UCS-2 for Arabic', () => {
    expect(detectEncoding('مرحبا')).toBe('UCS-2');
  });

  it('single GSM-7 part up to 160 chars', () => {
    const msg = 'Your OTP is 482910. Expires in 5 minutes. Do not share it.';
    const info = getSmsPartInfo(msg);
    expect(info.encoding).toBe('GSM-7');
    expect(info.parts).toBe(1);
    expect(info.creditsRequired).toBe(1);
  });

  it('splits a 200-char GSM-7 message into 2 parts', () => {
    const msg = 'a'.repeat(200);
    const info = getSmsPartInfo(msg);
    expect(info.parts).toBe(2);
  });

  it('splits a 460-char GSM-7 message into 4 parts', () => {
    const msg = 'a'.repeat(460);
    expect(getSmsPartInfo(msg).parts).toBe(4);
  });

  it('single UCS-2 part up to 70 chars', () => {
    const info = getSmsPartInfo('Habari 😊 Bei yako ni 5000 TZS');
    expect(info.encoding).toBe('UCS-2');
    expect(info.parts).toBe(1);
  });

  it('splits UCS-2 message over 70 chars into 2 parts', () => {
    // Use a single UTF-16 code unit character (not a surrogate-pair emoji)
    // so `.length` matches character count, same as SendAfrica's billing engine.
    const msg = 'م'.repeat(71);
    expect(getSmsPartInfo(msg).parts).toBe(2);
  });

  it('counts surrogate-pair emoji as 2 UTF-16 units each, matching JS string length', () => {
    // 71 emoji = 142 UTF-16 code units -> ceil(142 / 67) = 3 parts.
    const msg = '😊'.repeat(71);
    expect(getSmsPartInfo(msg).parts).toBe(3);
  });
});
