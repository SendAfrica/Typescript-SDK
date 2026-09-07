import { VoucherRateModel, VoucherResultModel, CreateVoucherParams, VoucherRate, VoucherResult } from '../types';
import { RequestFn } from './sms';

export class PaymentsResource {
  constructor(private makeRequest: RequestFn) {}

  async rate(): Promise<VoucherRate> {
    const envelope = await this.makeRequest('GET', '/vouchers/rate', { useApiKey: true });
    return VoucherRateModel.fromDict(envelope.data!);
  }

  async create(params: CreateVoucherParams, options: { idempotencyKey?: string } = {}): Promise<VoucherResult> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    const envelope = await this.makeRequest('POST', '/vouchers', { body: params, headers });
    return VoucherResultModel.fromDict(envelope.data!);
  }
}
