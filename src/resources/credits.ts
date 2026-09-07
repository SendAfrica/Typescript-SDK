import { CreditBalanceModel, CreditTransactionModel } from '../types';
import type { CreditBalance, CreditTransaction } from '../types';
import { RequestFn } from './sms';

export class CreditsResource {
  constructor(private makeRequest: RequestFn) {}

  async balance(): Promise<CreditBalance> {
    const envelope = await this.makeRequest('GET', '/credits/balance', { useApiKey: true });
    return CreditBalanceModel.fromDict(envelope.data!);
  }

  async history(query: { page?: number; perPage?: number } = {}): Promise<CreditTransaction[]> {
    const qs = new URLSearchParams();
    if (query.page !== undefined) qs.set('page', String(query.page));
    if (query.perPage !== undefined) qs.set('per_page', String(query.perPage));
    const qsStr = qs.toString() ? `?${qs.toString()}` : '';

    const envelope = await this.makeRequest('GET', `/credits/history${qsStr}`, { useApiKey: true });
    const data = envelope.data;
    const items = Array.isArray(data) ? data : (data && typeof data === 'object' && 'items' in data ? (data as any).items : []);
    return items.map((item: any) => CreditTransactionModel.fromDict(item));
  }
}
