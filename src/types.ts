// ─── SMS Types ────────────────────────────────────────────────────────────────

export interface SendSmsParams {
  to: string;
  message: string;
  from?: string;
}

export interface SendSmsOptions {
  idempotencyKey?: string;
  skipPhoneNormalization?: boolean;
}

export interface SendSmsResult {
  messageId: string;
  status: 'sent';
  cost: string;
  creditsUsed: number;
  requestId: string;
  timestamp: string;
}

export interface BalanceResult {
  accountId: string;
  balance: number;
}

export type MessageStatus = 'sent' | 'delivered' | 'failed' | 'pending';

export interface MessageLogEntry {
  id: string;
  accountId: string;
  toPhone: string;
  fromId: string | null;
  message: string;
  status: MessageStatus;
  smsParts: number;
  creditsUsed: number;
  creditsReserved: number;
  isInternational: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  platform: string | null;
}

export interface MessageLogsQuery {
  page?: number;
  perPage?: number;
  status?: MessageStatus;
  search?: string;
  dateFrom?: string;
}

export interface MessageLogsResult {
  items: MessageLogEntry[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// ─── Credits Types ───────────────────────────────────────────────────────────

export interface CreditBalance {
  accountId: string;
  balance: number;
}

export interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  createdAt?: string;
}

export interface CreditHistoryQuery {
  page?: number;
  perPage?: number;
}

// ─── Voucher / Payment Types ──────────────────────────────────────────────────

export type VoucherProvider = 'manual' | 'snippe' | 'card' | (string & {});

export interface VoucherRateTier {
  maxAmountTzs: number;
  rateTzsPerCredit: number;
}

export interface VoucherRate {
  minAmountTzs: number;
  rateTzsPerCredit?: number;
  tiers: VoucherRateTier[];
}

export interface VoucherRateResult {
  minAmountTzs: number;
  tiers: VoucherRateTier[];
}

export interface CreateVoucherParams {
  provider: VoucherProvider;
  amount: number;
  phone?: string;
  card?: Record<string, unknown>;
}

export interface DeclaredPhoneOtpResult {
  sent?: boolean;
  verified?: boolean;
}

export type VoucherStatus = 'pending' | 'confirmed' | 'failed' | (string & {});

export interface VoucherResult {
  id: string;
  provider: string;
  phone: string;
  amount: number;
  creditAmount: number;
  currency: string;
  status: VoucherStatus;
  packageId: string | null;
  createdAt: string;
}

// ─── Sender ID Types ──────────────────────────────────────────────────────────

export interface SenderIDEligibility {
  canRequest: boolean;
  purchasedUnits?: number;
  requiredUnits?: number;
  currency?: string;
  minimumPurchaseAmount?: string;
  pricePerUnit?: string;
  reason?: string | null;
}

export interface SenderIDCountry {
  uid: string;
  name: string;
  iso2: string;
  callingCode: string;
}

export interface SenderIDDocumentRequirement {
  uid: string;
  name: string;
  isRequired: boolean;
  acceptedFormats: string[];
  maxSizeKb?: number;
}

export interface SenderIDRules {
  minLength: number;
  maxLength: number;
  pattern: string;
  description?: string;
  reservedNames: string[];
}

export interface SenderIDRequirements {
  eligibility?: SenderIDEligibility;
  countries: SenderIDCountry[];
  documents: SenderIDDocumentRequirement[];
  purposes: string[];
  senderIdRules?: SenderIDRules;
  sampleMessageRules?: Record<string, unknown>;
}

export interface SenderID {
  id: string;
  name: string;
  country: string;
  purpose: string;
  sampleMessage: string;
  status: string;
  isUsable: boolean;
  isDefault: boolean;
  rejectionReason: string | null;
  errorReason: string | null;
  submittedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UsableSenderID {
  name: string;
  isDefault: boolean;
  type: 'system_default' | 'custom_approved';
  provider?: string;
  description?: string;
}

// ─── Rates Types ──────────────────────────────────────────────────────────────

export interface ProviderOperatorRate {
  operator: string;
  basic: number;
  plus: number;
  premium: number;
  max?: number;
}

export interface ProviderBulkSMSRate {
  provider: string;
  product: string;
  currency: string;
  sourceUrl: string;
  verifiedAt: string;
  operators: ProviderOperatorRate[];
}

export interface RateInfo {
  name: string;
  iso2: string;
  dialCode: string;
  rateTzs: number;
  providerBulkSms?: ProviderBulkSMSRate | null;
}

// ─── Model factory functions ──────────────────────────────────────────────────

export const CreditBalanceModel = {
  fromDict(data: any): CreditBalance {
    return {
      accountId: data.account_id,
      balance: data.balance,
    };
  },
};

export const CreditTransactionModel = {
  fromDict(data: any): CreditTransaction {
    return {
      id: data.id,
      type: data.type,
      amount: data.amount,
      balanceAfter: data.balance_after,
      description: data.description,
      createdAt: data.created_at,
    };
  },
};

export const VoucherRateModel = {
  fromDict(data: any): VoucherRate {
    return {
      minAmountTzs: data.min_amount_tzs,
      rateTzsPerCredit: data.rate_tzs_per_credit,
      tiers: (data.tiers ?? []).map((t: any) => ({
        maxAmountTzs: t.max_amount_tzs,
        rateTzsPerCredit: t.rate_tzs_per_credit,
      })),
    };
  },
};

export const VoucherResultModel = {
  fromDict(data: any): VoucherResult {
    return {
      id: data.id,
      provider: data.provider,
      phone: data.phone,
      amount: data.amount,
      creditAmount: data.credit_amount,
      currency: data.currency,
      status: data.status,
      packageId: data.package_id ?? null,
      createdAt: data.created_at,
    };
  },
};

export const RateInfoModel = {
  fromDict(data: any): RateInfo {
    const providerBulkSms = data.provider_bulk_sms
      ? {
          provider: data.provider_bulk_sms.provider,
          product: data.provider_bulk_sms.product,
          currency: data.provider_bulk_sms.currency,
          sourceUrl: data.provider_bulk_sms.source_url,
          verifiedAt: data.provider_bulk_sms.verified_at,
          operators: (data.provider_bulk_sms.operators ?? []).map((o: any) => ({
            operator: o.operator,
            basic: o.basic,
            plus: o.plus,
            premium: o.premium,
            max: o.max,
          })),
        }
      : null;

    return {
      name: data.name,
      iso2: data.iso2,
      dialCode: data.dial_code,
      rateTzs: data.rate_tzs,
      providerBulkSms,
    };
  },
};

export const SenderIDModel = {
  fromDict(data: any): SenderID {
    return {
      id: data.id,
      name: data.name,
      country: data.country,
      purpose: data.purpose,
      sampleMessage: data.sample_message,
      status: data.status,
      isUsable: data.is_usable,
      isDefault: data.is_default ?? false,
      rejectionReason: data.rejection_reason ?? null,
      errorReason: data.last_error ?? null,
      submittedAt: data.submitted_at ?? null,
      createdAt: data.created_at ?? null,
      updatedAt: data.updated_at ?? null,
    };
  },
};

export const SenderIDEligibilityModel = {
  fromDict(data: any): SenderIDEligibility {
    return {
      canRequest: data.can_request,
      purchasedUnits: data.purchased_units,
      requiredUnits: data.required_units,
      currency: data.currency,
      minimumPurchaseAmount: data.minimum_purchase_amount,
      pricePerUnit: data.price_per_unit,
      reason: data.reason ?? null,
    };
  },
};

export const SenderIDRulesModel = {
  fromDict(data: any): SenderIDRules {
    return {
      minLength: data.min_length,
      maxLength: data.max_length,
      pattern: data.pattern,
      description: data.description,
      reservedNames: data.reserved_names ?? [],
    };
  },
};

export const SenderIDRequirementsModel = {
  fromDict(data: any): SenderIDRequirements {
    return {
      eligibility: data.eligibility
        ? SenderIDEligibilityModel.fromDict(data.eligibility)
        : undefined,
      countries: (data.countries ?? []).map((c: any) => ({
        uid: c.uid,
        name: c.name,
        iso2: c.iso2,
        callingCode: c.calling_code,
      })),
      documents: (data.documents ?? []).map((d: any) => ({
        uid: d.uid,
        name: d.name,
        isRequired: d.is_required,
        acceptedFormats: d.accepted_formats ?? [],
        maxSizeKb: d.max_size_kb,
      })),
      purposes: data.purposes ?? [],
      senderIdRules: data.sender_id_rules ? SenderIDRulesModel.fromDict(data.sender_id_rules) : undefined,
      sampleMessageRules: data.sample_message_rules,
    };
  },
};

export const UsableSenderIDModel = {
  fromDict(data: any): UsableSenderID {
    return {
      name: data.name,
      isDefault: data.is_default,
      type: (data.type as 'system_default' | 'custom_approved') ?? 'system_default',
      provider: data.provider,
      description: data.description,
    };
  },
};
