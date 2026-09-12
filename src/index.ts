export { SendAfricaClient } from './client';
export type { SendAfricaClientConfig } from './client';

export { SendAfricaError, SendAfricaNetworkError, InvalidPhoneNumberError } from './errors';
export type { SendAfricaErrorPayload } from './errors';

export { normalizeTzPhone, isValidTzPhone, TZ_MOBILE_PREFIXES } from './phone';

export { detectEncoding, getSmsPartInfo, countSmsParts } from './sms-parts';
export type { SmsEncoding, SmsPartInfo } from './sms-parts';

export type {
  SendSmsParams,
  SendSmsOptions,
  SendSmsResult,
  BalanceResult,
  VoucherProvider,
  VoucherRateTier,
  VoucherRateResult,
  CreateVoucherParams,
  DeclaredPhoneOtpResult,
  VoucherStatus,
  VoucherResult,
  MessageStatus,
  MessageLogEntry,
  MessageLogsQuery,
  MessageLogsResult,
  CreditHistoryQuery,
  CreditBalance,
  CreditTransaction,
  VoucherRate,
  SenderID,
  SenderIDEligibility,
  SenderIDRules,
  SenderIDCountry,
  SenderIDDocumentRequirement,
  SenderIDRequirements,
  UsableSenderID,
  RateInfo,
  ProviderBulkSMSRate,
  ProviderOperatorRate,
} from './types';

export {
  CreditBalanceModel,
  CreditTransactionModel,
  VoucherRateModel,
  VoucherResultModel,
  RateInfoModel,
  SenderIDModel,
  SenderIDEligibilityModel,
  SenderIDRulesModel,
  SenderIDRequirementsModel,
  UsableSenderIDModel,
} from './types';

export {
  SMSResource,
  RatesResource,
  SenderIDsResource,
  CreditsResource,
  PaymentsResource,
} from './resources';
