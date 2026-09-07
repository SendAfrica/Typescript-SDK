import { RateInfo, RateInfoModel } from '../types';
import { RequestFn } from './sms';

export class RatesResource {
  constructor(private makeRequest: RequestFn) {}

  async list(): Promise<RateInfo[]> {
    const envelope = await this.makeRequest('GET', '/rates', { useApiKey: true });
    const data = envelope.data;
    const items = Array.isArray(data) ? data : (data && typeof data === 'object' && 'items' in data ? (data as any).items : []);
    return items.map((item: any) => RateInfoModel.fromDict(item));
  }

  async get(country: string): Promise<RateInfo> {
    const envelope = await this.makeRequest('GET', `/rates/${country}`, { useApiKey: true });
    return RateInfoModel.fromDict(envelope.data!);
  }
}
