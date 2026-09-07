# SendAfrica TypeScript SDK

[![npm](https://img.shields.io/npm/v/sendafrica)](https://www.npmjs.com/package/sendafrica)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Official TypeScript/JavaScript client for the [SendAfrica](https://sendafrica.online) SMS
Infrastructure-as-a-Service API. Designed to feel like Stripe's Node library:
simple for a first integration, enough control for production use.

---

## What You Get

- **Fail-fast validation** -- phone numbers are normalized to E.164 and
  validated locally *before* any network call. Bad input never hits the wire.
- **Automatic retries** -- exponential backoff on 429/5xx/connection errors.
  No retry loops in your code.
- **Phone number normalization** -- pass `0712345678`, `+255 712 345 678`, or
  `255712345678` and it all works. The SDK handles the conversion.
- **SMS cost estimation** -- `getSmsPartInfo()` tells you encoding
  (GSM-7 vs UCS-2), segment count, and credit cost with zero network calls.
- **Typed errors** -- every error is an `instanceof`-discriminable class
  with `.code`, `.httpStatus`, and `.requestId`. Quick discrimination via
  `.isInsufficientCredits`, `.isRateLimited`, `.isUnauthorized` getters.
- **Idempotent sends** -- pass an `idempotencyKey` to safely retry network
  failures without duplicating messages.
- **Zero runtime dependencies** -- only `fetch` (Node 18+, or inject your own).
- **Dual CJS + ESM + `.d.ts`** -- works with `require`, `import`, and full
  TypeScript type inference.

---

## Installing

```bash
npm install sendafrica
```

**Requirements:** Node 18+ (uses global `fetch`). For Node < 16, inject a
custom `fetch` implementation.

---

## Prerequisites for Publishing

1. Ensure you're logged in to npm: `npm login` (if needed)
2. Ensure you have publish rights for the `sendafrica` package on npm
3. Bump the version in `package.json` (following SemVer — we use 1.1.0 to match the Python SDK)
4. Run the full verification:
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```
5. Publish:
   ```bash
   npm publish
   ```
   Or for scoped releases / beta tags:
   ```bash
   npm publish --access public
   ```

> **Note:** The `prepublishOnly` script runs `typecheck`, `test`, and `build` automatically before publish. The build output in `dist/` is included in the package via the `files` field.

---

## Quickstart

```ts
import { SendAfricaClient } from 'sendafrica';

const client = new SendAfricaClient({
  apiKey: process.env.SENDAFRICA_API_KEY!, // starts with "SA-"
});

const result = await client.sms.send({
  to: '0712345678',
  message: 'Your order has been confirmed.',
});

console.log(result.messageId, result.creditsUsed);
```

CommonJS:

```js
const { SendAfricaClient } = require('sendafrica');
```

---

## Authentication

The SDK requires an API key. Pass it directly to the constructor:

```ts
const client = new SendAfricaClient({ apiKey: 'SA-xxxxx' });
```

Every authenticated request includes both headers:

```
X-API-Key: <api_key>
Authorization: Bearer <api_key>
```

This dual-header approach ensures compatibility with all SendAfrica API keys. JWT-based
operations (e.g. message logs fetched with a dashboard token) use `Authorization: Bearer <jwt>` only.
The SDK also sends a `User-Agent: sendafrica-node/1.1` header and a unique `X-Request-Id` UUID
per request for tracing.

---

## Configuration

```ts
const client = new SendAfricaClient({
  apiKey: 'SA-xxxxx',
  baseUrl: 'https://api.sendafrica.online',  // default
  timeoutMs: 15_000,                         // per-request timeout, default 15s
  maxRetries: 2,                             // retries on 429/5xx/network errors
  fetch: myCustomFetch,                      // inject a custom fetch implementation
});
```

| Parameter | Default | Description |
|---|---|---|
| `apiKey` | -- (required) | Your SendAfrica API key |
| `baseUrl` | `"https://api.sendafrica.online"` | Override for testing |
| `timeoutMs` | `15000` | Per-request timeout in milliseconds |
| `maxRetries` | `2` | Retries on 429/5xx/network errors. Set `0` to disable |
| `fetch` | `globalThis.fetch` | Inject a custom fetch (e.g. `node-fetch` on Node < 18) |

---

## Resources

| Resource | Methods |
|---|---|
| `client.sms.send()` | Send a single SMS |
| `client.sms.bulk()` | Send to many recipients in one API call (up to 100) |
| `client.sms.sendMany()` | Send to many recipients via individual calls with rate limiting |
| `client.sms.logs()` | List SMS delivery logs (requires JWT) |
| `client.credits.balance()` | Check credit balance |
| `client.credits.history()` | List credit transactions |
| `client.rates.list()` | Fetch the full rate card |
| `client.rates.get(country)` | Fetch rate for a single country |
| `client.senderIds.list()` | List registered sender IDs |
| `client.senderIds.create()` | Submit a new sender ID request |
| `client.senderIds.get(id)` | Fetch sender ID detail |
| `client.senderIds.usable()` | List usable sender IDs |
| `client.senderIds.requirements()` | Fetch sender ID registration requirements |
| `client.payments.rate()` | Fetch voucher pricing tiers |
| `client.payments.create()` | Top up via mobile money |

### SMS

#### `client.sms.send(params, options?)`

Send a single SMS. Phone numbers are normalized locally to E.164 before
any network call.

```ts
const result = await client.sms.send(
  { to: '0712345678', message: 'Your OTP is 123456', from: 'MyBrand' },
  { idempotencyKey: 'order-4821-confirmation' },  // optional, reuse on retry
);

console.log(result.messageId);    // "SA-abc123..."
console.log(result.status);       // "sent"
console.log(result.creditsUsed);  // 1
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `to` | `string` | yes | Phone number (any format -- normalized locally) |
| `message` | `string` | yes | SMS body text |
| `from` | `string` | no | Custom sender ID (must be pre-approved by SendAfrica) |

| Option | Type | Description |
|---|---|---|
| `idempotencyKey` | `string` | Unique key for safe retries (e.g. order ID) |
| `skipPhoneNormalization` | `boolean` | Send `to` as-is without validation |

**Returns:** `SendSmsResult`

| Field | Type | Description |
|---|---|---|
| `messageId` | `string` | Server-assigned unique ID |
| `status` | `"sent"` | Delivery status |
| `cost` | `string` | Cost string (e.g. `"KES 1.00"`) |
| `creditsUsed` | `number` | Credits consumed |
| `requestId` | `string` | Request ID for tracing |
| `timestamp` | `string` | Server timestamp |

**Throws:** `InvalidPhoneNumberError`, `SendAfricaError`

> **Note:** `from` only appears on the recipient's phone once SendAfrica
> has approved that sender ID; an unapproved one silently falls back to
> the default `SendAfrika` sender and the message still sends -- the SDK
> can't detect this for you.

### Credits

#### `client.credits.balance()`

```ts
const { accountId, balance } = await client.credits.balance();
console.log(accountId);  // "acc_abc123"
console.log(balance);    // 4820
```

**Returns:** `BalanceResult`

| Field | Type | Description |
|---|---|---|
| `accountId` | `string` | Account identifier |
| `balance` | `number` | Current credit balance |

#### `client.credits.history(query?)`

List credit transactions with page-based pagination.

```ts
const history = await client.credits.history({ page: 1, perPage: 25 });
console.log(history);
```

**Parameters:**

| Parameter | Default | Description |
|---|---|---|
| `page` | `1` | Page number (1-indexed) |
| `perPage` | `25` | Items per page |

**Returns:** `unknown` (raw API response -- type definition is pending
the API's response schema stabilizing)

### Vouchers / Top-up

Credit top-ups are pay-as-you-go: you specify any TZS amount (above
the minimum) and the API converts it to credits at the current tiered
rate.

#### `client.payments.rate()`

Fetch the current pricing schedule: minimum top-up amount and the
tiered TZS-per-credit rate table.

```ts
const rate = await client.payments.rate();
console.log(`Minimum top-up: ${rate.minAmountTzs} TZS`);

for (const tier of rate.tiers) {
  console.log(`  Up to ${tier.maxAmountTzs} TZS: ${tier.rateTzsPerCredit} TZS/credit`);
}
```

**Returns:** `VoucherRateResult`

| Field | Type | Description |
|---|---|---|
| `minAmountTzs` | `number` | Minimum top-up amount in TZS |
| `tiers` | `VoucherRateTier[]` | Pricing tiers |

Where each `VoucherRateTier` is:

| Field | Type | Description |
|---|---|---|
| `maxAmountTzs` | `number` | Upper bound (0 = unbounded/top tier) |
| `rateTzsPerCredit` | `number` | Price per credit in TZS |

Use this to validate an amount client-side before calling `client.payments.create()`:

```ts
const rate = await client.payments.rate();
const amountTzs = 30000;

if (amountTzs < rate.minAmountTzs) {
  console.log(`Minimum is ${rate.minAmountTzs} TZS`);
}
```

#### `client.payments.create(params, options?)`

```ts
const voucher = await client.payments.create({ provider: 'snippe', amount: 50000 });
console.log(voucher.id, voucher.status, voucher.creditAmount);
// voucher.status === 'pending' -- mobile-money top-ups always charge YOUR
// account's own verified phone number, never one you supply.
// There's no status-poll endpoint: poll `client.credits.balance()` or watch for a
// confirmation notification instead.
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `provider` | `"snippe"` | yes | Payment provider |
| `amount` | `number` | yes | Top-up amount in TZS (must be positive) |

**Returns:** `VoucherResult`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Voucher/order ID |
| `provider` | `string` | Payment provider used |
| `phone` | `string` | Account's own verified phone |
| `amount` | `number` | Amount in TZS |
| `creditAmount` | `number` | Credits to be credited |
| `currency` | `string` | `"TZS"` |
| `status` | `VoucherStatus` | `"pending"` / `"confirmed"` / `"failed"` |
| `packageId` | `string \| null` | Package ID if applicable |
| `createdAt` | `string` | Timestamp |

### Message Logs

#### `client.sms.logsJwt(jwtToken, query?)`

Message logs require a **JWT** (dashboard login token) — not the API
key. Pass it explicitly; it's never mixed with `X-API-Key`.

```ts
const logs = await client.sms.logsJwt(jwtToken, { status: 'failed', page: 1 });

for (const entry of logs.items) {
  console.log(entry.id, entry.toPhone, entry.status);
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `jwtToken` | `string` | yes | Dashboard JWT (Bearer auth) |
| `page` | `number` | no | Page number (default: 1) |
| `perPage` | `number` | no | Items per page (default: 25) |
| `status` | `MessageStatus` | no | Filter by `"sent"` / `"delivered"` / `"failed"` |

**Returns:** `MessageLogsResult`

| Field | Type | Description |
|---|---|---|
| `items` | `MessageLogEntry[]` | Log entries |
| `total` | `number` | Total matching entries |
| `page` | `number` | Current page |
| `perPage` | `number` | Items per page |
| `totalPages` | `number` | Total pages |

Where each `MessageLogEntry` is:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Message ID |
| `toPhone` | `string` | Recipient phone |
| `fromId` | `string \| null` | Sender ID |
| `message` | `string` | SMS body |
| `status` | `MessageStatus` | `"sent"` / `"delivered"` / `"failed"` |
| `smsParts` | `number` | Number of SMS segments |
| `creditsUsed` | `number` | Credits consumed |
| `sentAt` | `string` | When the message was sent |
| `deliveredAt` | `string \| null` | When delivery was confirmed |
| `createdAt` | `string` | When the message was created |

---

## Phone Number Handling

The SDK normalizes phone numbers to E.164 format locally, before any
network call. These formats all work:

| Input | Output |
|---|---|
| `0712345678` | `+255712345678` |
| `712345678` | `+255712345678` |
| `255712345678` | `+255712345678` |
| `+255712345678` | `+255712345678` |
| `+255 712 345 678` | `+255712345678` |

The SDK validates that the number uses a valid Tanzania mobile prefix
(`071` through `078`). Numbers that cannot be normalized raise
`InvalidPhoneNumberError` without hitting the API.

You can also use the helpers directly:

```ts
import { normalizeTzPhone, isValidTzPhone } from 'sendafrica';

normalizeTzPhone('0712345678');   // '+255712345678'
isValidTzPhone('+254712345678');  // false -- not a Tanzania number
```

---

## SMS Part / Credit Calculator

Estimate cost and encoding before you send. These are pure local
computations -- zero network calls:

```ts
import { getSmsPartInfo, detectEncoding, countSmsParts } from 'sendafrica';

const info = getSmsPartInfo('Hello, your order is ready.');
// { encoding: 'GSM-7', length: 28, parts: 1, creditsRequired: 1 }

const emojiInfo = getSmsPartInfo('Habari 😊 Bei yako ni 5000 TZS');
// { encoding: 'UCS-2', length: 31, parts: 1, creditsRequired: 1 }

detectEncoding('Hello');   // 'GSM-7'
detectEncoding('Hello 😊'); // 'UCS-2'

countSmsParts('Hello');    // 1
```

**Returns:** `SmsPartInfo`

| Field | Type | Description |
|---|---|---|
| `encoding` | `SmsEncoding` | `"GSM-7"` or `"UCS-2"` |
| `length` | `number` | Character count |
| `parts` | `number` | Number of SMS segments |
| `creditsRequired` | `number` | Estimated credits (1 per segment) |

Segmentation rules:
- **GSM-7** (basic Latin + limited symbols): 160 chars/single, 153 when
  concatenated
- **UCS-2** (emoji, accented characters outside GSM-7): 70 chars/single,
  67 when concatenated

> **Note:** `creditsRequired` is an estimate for UI display. The authoritative
> number is `creditsUsed` on the `SendSmsResult` from `client.sms.send()`.

---

## Error Handling

Every failed request throws a typed error. Catch the base class for
generic handling, or use the convenience getters for quick discrimination:

```ts
import { SendAfricaError } from 'sendafrica';

try {
  await client.sms.send({ to: '0712345678', message: 'Hi' });
} catch (err) {
  if (err instanceof SendAfricaError) {
    if (err.isInsufficientCredits) {
      // top up first
    } else if (err.isRateLimited) {
      // back off -- though the client already retries this automatically
    } else if (err.isUnauthorized) {
      // check your API key
    } else {
      console.error(err.code, err.message, err.requestId);
    }
  } else {
    throw err; // SendAfricaNetworkError, InvalidPhoneNumberError, etc.
  }
}
```

### Exception hierarchy

```
SendAfricaError               (API responded with success:false)
├── .isInsufficientCredits    (code === 'insufficient_credits')
├── .isRateLimited            (code === 'rate_limit_exceeded')
└── .isUnauthorized           (code === 'unauthorized')

SendAfricaNetworkError        (request failed after retries, or non-JSON response)

InvalidPhoneNumberError       (to isn't a valid Tanzania mobile number)
```

### Attributes on every `SendAfricaError`

| Attribute | Type | Description |
|---|---|---|
| `.code` | `string` | API error code (e.g. `"insufficient_credits"`) |
| `.message` | `string` | Human-readable error message |
| `.httpStatus` | `number \| undefined` | HTTP status code |
| `.requestId` | `string \| undefined` | Request ID from response headers |

### Retry behavior

The SDK automatically retries on:

| Status | Behavior |
|---|---|
| `429` | Exponential backoff |
| `500`, `502`, `503`, `504` | Exponential backoff |
| Network errors | Exponential backoff |

Backoff formula: `min(1000 * 2^(attempt-1), 8000) + random(0..250)` ms.
Default max retries: 2. Total max wait per request: ~16 seconds.

---

## Bulk Sending

For a handful of numbers, space out calls yourself:

```ts
for (const to of numbers) {
  try {
    await client.sms.send({ to, message });
  } catch (err) {
    console.error(to, err);
  }
  await new Promise((r) => setTimeout(r, 100)); // ~600/min, safe for Pro plan
}
```

For campaigns of 500+ contacts, use the **Campaigns** feature in the
SendAfrica dashboard instead -- it handles throttling, retries, and
delivery reporting for you. This SDK intentionally doesn't wrap that
endpoint.

---

## Lessons: Using the SDK Effectively

These are practical patterns for getting the most out of the SDK.

### Lesson 1: Check balance before sending

Avoid `SendAfricaError` with code `insufficient_credits` by checking first:

```ts
const { balance } = await client.credits.balance();
if (balance < 10) {
  console.log(`Low balance: ${balance} credits remaining`);
  // prompt user to top up
}
```

### Lesson 2: Preview cost with getSmsPartInfo()

`getSmsPartInfo()` makes zero network calls -- it's pure local computation.
Use it to show users the cost before they confirm:

```ts
import { getSmsPartInfo } from 'sendafrica';

const info = getSmsPartInfo(message);
const cost = info.creditsRequired;
// Show "This message will cost {cost} credit(s)" in your UI
```

### Lesson 3: Use idempotency keys for safe retries

If a network error occurs after the server processed the request, the
SDK retries automatically. Use an idempotency key to prevent duplicate
messages:

```ts
await client.sms.send(
  { to: '0712345678', message: 'Order confirmed' },
  { idempotencyKey: `order-${orderId}-confirmation` },
);
```

### Lesson 4: Phone numbers just work

Don't preprocess phone numbers in your code. Pass whatever format
you have:

```ts
// All of these work:
await client.sms.send({ to: '0712345678', message: 'Hello' });
await client.sms.send({ to: '+255712345678', message: 'Hello' });
await client.sms.send({ to: '255712345678', message: 'Hello' });
await client.sms.send({ to: '+255 712 345 678', message: 'Hello' });
```

### Lesson 5: Catch specific errors

Don't catch `SendAfricaError` for everything -- use the convenience
getters for better UX:

```ts
try {
  await client.sms.send({ to: '0712345678', message: 'Hello' });
} catch (err) {
  if (err instanceof InvalidPhoneNumberError) {
    // Show "Please check the phone number"
  } else if (err instanceof SendAfricaError && err.isInsufficientCredits) {
    // Show "Please top up your credits"
  } else if (err instanceof SendAfricaError && err.isRateLimited) {
    // Show "Please wait a moment and try again"
  }
}
```

### Lesson 6: Retry is built in

Don't implement your own retry logic. The SDK handles 429 and 5xx
automatically with exponential backoff:

```ts
// This is safe -- the SDK retries transient failures internally
const result = await client.sms.send({ to: '0712345678', message: 'Hello' });
```

### Lesson 7: Use injectable fetch for testing

The SDK accepts a custom `fetch` implementation, making it trivial to
mock in tests:

```ts
const fetchMock = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ success: true, data: { message_id: 'test-123', status: 'sent', credits_used: 1 } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }),
);

const client = new SendAfricaClient({ apiKey: 'SA-test', fetch: fetchMock });
const result = await client.sms.send({ to: '0712345678', message: 'Test' });
// result.messageId === 'test-123'
```

### Lesson 8: Message logs use a separate auth mechanism

Message logs require a JWT from the dashboard login -- not the API key.
This is by design (the API uses two separate auth systems):

```ts
const jwtToken = '...'; // from dashboard login
const logs = await client.sms.logsJwt(jwtToken, { status: 'failed' });
```

---

## Project Layout

```
src/
├── index.ts            # Public API exports
├── client.ts           # SendAfricaClient (HTTP, retry, auth, resource wiring)
├── types.ts            # All request/response type definitions + model factories
├── errors.ts           # SendAfricaError, SendAfricaNetworkError, InvalidPhoneNumberError
├── phone.ts            # TZ mobile number normalization
├── sms-parts.ts        # GSM-7/UCS-2 encoding + segment analysis
└── resources/
    ├── sms.ts          # SMSResource: send, sendMany, bulk, logs
    ├── credits.ts      # CreditsResource: balance, history
    ├── rates.ts        # RatesResource: list, get
    ├── senderids.ts    # SenderIDsResource: list, create, get, usable, requirements
    └── payments.ts     # PaymentsResource: rate, create
test/
├── client.test.ts      # Client HTTP, retry, error handling tests
├── phone.test.ts       # Phone normalization tests
└── sms-parts.test.ts   # SMS encoding + part calculation tests
```

---

## Roadmap

- **Phase 1 (done):** Client, auth (X-API-Key + Bearer fallback), SMS send/bulk/sendMany, credits balance/history,
  rates list/get, sender IDs (list/create/get/usable/requirements), payments (rate/create), message logs,
  error hierarchy, response types, phone normalization, SMS part calculator, retry/backoff, idempotency
- **Phase 2:** Webhook signature verification, async client
- **Phase 3:** Campaigns, contacts, templates, scheduling

---

## Contributing

Run tests:

```bash
npm install
npm test
```

Type-check without emitting:

```bash
npm run typecheck
```

Build:

```bash
npm run build
```

---

## License

MIT
