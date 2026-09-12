import {
  SenderIDModel,
  SenderIDRequirementsModel,
  UsableSenderIDModel,
  SenderID,
  SenderIDRequirements,
  UsableSenderID,
} from '../types';
import { RequestFn } from './sms';

export class SenderIDsResource {
  constructor(private makeRequest: RequestFn) {}

  async requirements(): Promise<SenderIDRequirements> {
    const envelope = await this.makeRequest('GET', '/sender-ids/requirements', { useApiKey: true });
    return SenderIDRequirementsModel.fromDict(envelope.data!);
  }

  async usable(provider?: string): Promise<UsableSenderID[]> {
    const qs = provider ? `?provider=${provider}` : '';
    const envelope = await this.makeRequest('GET', `/sender-ids/usable${qs}`, { useApiKey: true });
    const data = envelope.data;
    const items = Array.isArray(data) ? data : (data && typeof data === 'object' && 'items' in data ? (data as any).items : []);
    return items.map((item: any) => UsableSenderIDModel.fromDict(item));
  }

  async list(): Promise<SenderID[]> {
    const envelope = await this.makeRequest('GET', '/sender-ids', { useApiKey: true });
    const data = envelope.data;
    const items = Array.isArray(data) ? data : (data && typeof data === 'object' && 'items' in data ? (data as any).items : []);
    return items.map((item: any) => SenderIDModel.fromDict(item));
  }

  async create(params: {
    name: string;
    country: string;
    purpose: string;
    sampleMessage: string;
    documents?: Array<{ requirementUid: string; filename: string; contentBase64: string }>;
  }): Promise<SenderID> {
    const body: Record<string, unknown> = {
      name: params.name,
      country: params.country,
      purpose: params.purpose,
      sample_message: params.sampleMessage,
    };
    if (params.documents) {
      body.documents = params.documents.map((d) => ({
        requirement_uid: d.requirementUid,
        filename: d.filename,
        content_base64: d.contentBase64,
      }));
    }

    const envelope = await this.makeRequest('POST', '/sender-ids', { body });
    return SenderIDModel.fromDict(envelope.data!);
  }

  async get(senderId: string): Promise<SenderID> {
    const envelope = await this.makeRequest('GET', `/sender-ids/${senderId}`, { useApiKey: true });
    return SenderIDModel.fromDict(envelope.data!);
  }

  async setDefault(senderId: string): Promise<SenderID> {
    const envelope = await this.makeRequest('PUT', '/sender-ids/default', {
      body: { sender_id: senderId },
      useApiKey: true,
    });
    return SenderIDModel.fromDict(envelope.data!);
  }
}
