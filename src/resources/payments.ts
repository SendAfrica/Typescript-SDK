import {
  VoucherRateModel,
  VoucherResultModel,
  CreateVoucherParams,
  VoucherRate,
  VoucherResult,
  DeclaredPhoneOtpResult,
} from '../types';
import { RequestFn } from './sms';

export class PaymentsResource {
  constructor(private makeRequest: RequestFn) {}

  async rate(): Promise<VoucherRate> {
    const envelope = await this.makeRequest('GET', '/vouchers/rate', { useApiKey: true });
    return VoucherRateModel.fromDict(envelope.data!);
  }

  async create(params: CreateVoucherParams, options: { idempotencyKey?: string } = {}): Promise<VoucherResult> {
    const body = {
      ...params,
      ...(params.phone ? { phone: params.phone } : {}),
    };
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    const envelope = await this.makeRequest('POST', '/vouchers', { body, headers });
    return VoucherResultModel.fromDict(envelope.data!);
  }

  async sendDeclaredPhoneOtp(phone: string): Promise<DeclaredPhoneOtpResult> {
    const envelope = await this.makeRequest('POST', '/vouchers/otp/send', {
      body: { phone },
      useApiKey: true,
    });
    return (envelope.data ?? {}) as DeclaredPhoneOtpResult;
  }

  async verifyDeclaredPhoneOtp(phone: string, otp: string): Promise<DeclaredPhoneOtpResult> {
    const envelope = await this.makeRequest('POST', '/vouchers/otp/verify', {
      body: { phone, otp },
      useApiKey: true,
    });
    return (envelope.data ?? {}) as DeclaredPhoneOtpResult;
  }
}
