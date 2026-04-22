# @venumdev/sdk

TypeScript SDK for the Venum Solana execution API.

**[www.venum.dev](https://www.venum.dev)** &nbsp;·&nbsp; **[docs.venum.dev](https://docs.venum.dev)** &nbsp;·&nbsp; [API reference](https://docs.venum.dev/api) &nbsp;·&nbsp; [Builder guides](https://docs.venum.dev/guide) &nbsp;·&nbsp; [Dashboard](https://app.venum.dev)

Zero runtime dependencies. Isomorphic (Node 22+ and modern browsers). Covers every public endpoint — prices, pools, pairs, tokens, search, trending, charts, quotes, swap build/submit, raw tx send, balances, balance history, usage, stats, transaction status & trace — plus all SSE streams (prices, pools, tx, balance history).

```sh
pnpm add @venumdev/sdk
```

```ts
import { VenumClient, solToLamports } from '@venumdev/sdk';

const venum = new VenumClient({ apiKey: process.env.VENUM_API_KEY });

const quote = await venum.quote({
  inputMint: 'So11111111111111111111111111111111111111112',
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  amount: solToLamports(1),
  slippageBps: 50,
});
console.log(quote.topRoutes[0]);
```

Working examples for every flow live in [`examples/`](./examples).

## Resources

- [**www.venum.dev**](https://www.venum.dev) — product site, pricing, sign up
- [**docs.venum.dev**](https://docs.venum.dev) — complete documentation hub
  - [API reference](https://docs.venum.dev/api) — every HTTP endpoint with request/response shapes
  - [Builder guides](https://docs.venum.dev/guide) — quickstart, authentication, quoting, swap building, tx submission, pool state, rate limits, composable instructions, migration paths
- [**app.venum.dev**](https://app.venum.dev) — dashboard: manage API keys, view usage, upgrade plan
- [**api.venum.dev**](https://api.venum.dev) — production API endpoint (this is what the SDK hits by default)
- [GitHub — solana-venum-sdk](https://github.com/venumhq/solana-venum-sdk) — this package
- [GitHub — solana-venum-cli](https://github.com/venumhq/solana-venum-cli) — sibling CLI

## Features

- Covers the full public API — no missing endpoints.
- **Typed everything** — response interfaces for every endpoint, discriminated unions for every SSE event.
- **Two stream modes** — callback (`streamPrices(tokens, { onEvent })`) *and* async iterator (`for await (const msg of venum.iteratePrices(tokens))`).
- **AbortSignal** on every method, REST and SSE.
- **Automatic retry** with jittered exponential backoff + `Retry-After` honored. Opt out globally (`retry: false`) or per-request. Never retries non-idempotent calls (`submitSwap`, `send`) or auth failures (401, 403).
- **One-shot swap helper** — `venum.swap({...signer, waitFor: 'confirmed'})` collapses build → sign → submit → wait into a single call, with a signer callback that works with any wallet lib.
- **Amount helpers** — `toBaseUnits`, `fromBaseUnits`, `solToLamports`, etc.
- **Env fallback in Node** — reads `VENUM_API_KEY` / `VENUM_API_URL` if omitted; explicit options always win.
- **Zero runtime deps** — platform `fetch` + `TextDecoder`. No polyfills, no bloat.

## Client options

```ts
new VenumClient({
  baseUrl: 'https://api.venum.dev',   // default; override for self-hosted
  apiKey: '...',                       // X-API-Key; falls back to VENUM_API_KEY in Node
  userAgent: '@venumdev/sdk/0.1.0',    // override if you want
  fetch: customFetch,                  // inject middleware or a test mock
  retry: { retries: 3, baseDelayMs: 500, maxDelayMs: 5000, retryOn: [429, 502, 503, 504] },
});
```

Get an API key at [www.venum.dev](https://www.venum.dev) (manage it at [app.venum.dev](https://app.venum.dev)). Required for paid endpoints (quote, swap, tx, trace, streams, balances); public endpoints (prices, pools, tokens, pairs, stats) work without one but are IP rate-limited. Full pricing and tier limits: [docs.venum.dev/guide](https://docs.venum.dev/guide).

## Cancellation

Every method accepts an `AbortSignal`. Aborting cancels the in-flight request, any pending retry, and (for streams) the reader + future reconnects.

```ts
const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 2000);
await venum.quote(req, { signal: ctrl.signal });

// one-shot timeout
await venum.quote(req, { signal: AbortSignal.timeout(2000) });
```

## Retry policy

Enabled by default with sensible values. Highlights:

| Rule | Behavior |
|---|---|
| 401, 403 | **Never retried.** Surfaces immediately so you can prompt sign-in / upgrade. |
| 404, 400 | Never retried (resource / caller error). |
| 429 | Retried, honoring `Retry-After`. After exhausting retries, throws `VenumApiError` with `status: 429`. |
| 502, 503, 504 | Retried with jittered exponential backoff. |
| Network errors | Retried. |
| `submitSwap`, `send` | **Never retried** (non-idempotent — a double-submit could land twice). |

Per-request override: `await venum.quote(req, { retry: false })` or `{ retry: { retries: 5 } }`.

Disable globally: `new VenumClient({ retry: false })`.

## Errors

```ts
import { VenumApiError, VenumNetworkError } from '@venumdev/sdk';

try {
  await venum.quote(req);
} catch (err) {
  if (err instanceof VenumApiError) {
    if (err.status === 401) /* prompt sign-in */;
    if (err.status === 403) /* upgrade your plan */;
    if (err.status === 429) /* rate limit hit after retries */;
  } else if (err instanceof VenumNetworkError) {
    // err.url, err.cause
  } else if ((err as Error).name === 'AbortError') {
    // caller cancelled
  }
}
```

See [`examples/16-error-handling.ts`](./examples/16-error-handling.ts) for a complete mapping pattern.

## Endpoints

Every method below maps 1-to-1 to an HTTP endpoint. For the full request/response schema of each, see [docs.venum.dev/api](https://docs.venum.dev/api).


### Meta
- `health()` — `GET /health`
- `usage()` — `GET /v1/usage`
- `volumeStats({ from, to })` — `GET /v1/stats/volume`

### Tokens & discovery
- `tokens({ category? })` — `GET /v1/tokens`
- `token(mint, { include?, topPools? })` — `GET /v1/token/:mint`
- `search(query, { limit? })` — `GET /v1/search`
- `trending({ limit? })` — `GET /v1/trending`
- `chart(mint, { range?, interval? })` — `GET /v1/chart/:mint`

### Prices
- `price(token)` — `GET /v1/price/:token`
- `prices(tokens[])` — `GET /v1/prices?tokens=...`

### Pools
- `pool(address)` — `GET /v1/pool/:address`
- `pools({ token?, tokens?, pair?, dex?, limit?, offset? })` — `GET /v1/pools`
- `newPools({ limit? })` — `GET /v1/pools/new`
- `poolsSeed({ ...filters })` — `GET /v1/pools/seed`
- `pairs(mint)` — `GET /v1/pairs/:mint`

### Balances
- `balances(wallet)` — `GET /v1/balances/:wallet`
- `balanceHistory({ walletAddress, heliusRpcUrl, assetMint? })` — `GET /v1/history/balance`

### Quote & swap
- `quote(request)` — `POST /v1/quote`
- `buildSwap(request)` — `POST /v1/swap/build`
- `submitSwap({ quoteId, signedTransaction })` — `POST /v1/swap`
- `send(signedTransactionBase64)` — `POST /v1/send`
- `swap({ ...request, signer, waitFor? })` — convenience wrapper (see below)

### Transaction
- `txStatus(signature)` — `GET /v1/tx/:signature`
- `trace(signature)` — `GET /v1/trace/:signature`
- `waitForTx(signature, { events? })` — resolves at first terminal event

### Streams (callback + iterator)
| Callback | Iterator | HTTP |
|---|---|---|
| `streamPrices(tokens, opts)` | `iteratePrices(tokens, opts)` | `GET /v1/stream/prices` |
| `streamPools(opts)` | `iteratePools(opts)` | `GET /v1/stream/pools` |
| `streamTx(signatures, opts)` | `iterateTx(signatures, opts)` | `GET /v1/stream/tx` |
| `streamBalanceHistory(params, opts)` | `iterateBalanceHistory(params, opts)` | `GET /v1/stream/balance-history` |

## Streams

Both modes deliver the same typed discriminated-union messages. Pick whichever fits your code.

### Callback mode

```ts
const ctrl = new AbortController();

await venum.streamPrices(['SOL', 'JITOSOL'], {
  signal: ctrl.signal,
  onError: (msg) => console.warn('reconnecting:', msg),
  onEvent: (msg) => {
    switch (msg.type) {
      case 'ready':     console.log('ready at', msg.ts); break;
      case 'price':     console.log(msg.price.token, msg.price.priceUsd); break;
      case 'heartbeat': /* periodic keep-alive */ break;
    }
  },
});
```

### Iterator mode

```ts
const ctrl = new AbortController();

for await (const msg of venum.iteratePrices(['SOL'], { signal: ctrl.signal })) {
  if (msg.type === 'price') console.log(msg.price.priceUsd);
}
```

### Typed messages

```ts
type PriceStreamMessage =
  | { type: 'ready'; ts: number }
  | { type: 'price'; price: TokenPrice }
  | { type: 'heartbeat'; ts: number };

type PoolStreamMessage =
  | { type: 'ready'; ts: number }
  | { type: 'new-pool'; pool: NewPoolEventPayload }
  | { type: 'heartbeat'; ts: number };

type TxStreamMessage =
  | { type: 'ready'; ts: number; signatures: string[] }
  | { type: 'tx'; tx: TxEventPayload }
  | { type: 'error'; signature: string; error: string; reason: string }
  | { type: 'heartbeat'; ts: number };

type BalanceHistoryStreamMessage =
  | { type: 'ready'; walletAddress: string; assetMint: string; ts: number }
  | { type: 'progress'; payload: unknown }
  | { type: 'points'; walletAddress: string; assetMint: string; points: BalanceHistoryPoint[] }
  | { type: 'complete'; result: BalanceHistoryResult }
  | { type: 'error'; error: string; details: string }
  | { type: 'heartbeat'; ts: number };
```

### Reconnection

- **Prices + pools** reconnect every 3s by default (`reconnectDelayMs`).
- **Tx + balance-history** are single-shot (reconnect disabled by default — they're event-terminal).
- Pass `reconnectDelayMs: 0` to any stream to disable reconnect.
- `onError` fires per failed attempt before a reconnect — use it to surface transient noise to users if needed.

## Swap flow

Deep-dive guides: [Quoting](https://docs.venum.dev/guide), [Swap Building](https://docs.venum.dev/guide), [Transaction Submission](https://docs.venum.dev/guide), [Improve TX Landing Rate](https://docs.venum.dev/guide).

### Manual (full control)

```ts
import { VersionedTransaction, Keypair } from '@solana/web3.js';

const build = await venum.buildSwap({
  inputMint, outputMint, amount: solToLamports(0.1),
  userPublicKey: wallet.publicKey.toBase58(),
  slippageBps: 50,
});

const tx = VersionedTransaction.deserialize(Buffer.from(build.transaction, 'base64'));
tx.sign([wallet]);

const submit = await venum.submitSwap({
  quoteId: build.quoteId,
  signedTransaction: Buffer.from(tx.serialize()).toString('base64'),
});

const landed = await venum.waitForTx(submit.signature, { events: ['confirmed'] });
```

### One-shot helper

```ts
const result = await venum.swap({
  inputMint, outputMint, amount: solToLamports(0.1), slippageBps: 50,
  signer: {
    publicKey: wallet.publicKey.toBase58(),
    sign: (unsignedBase64) => {
      const tx = VersionedTransaction.deserialize(Buffer.from(unsignedBase64, 'base64'));
      tx.sign([wallet]);
      return Buffer.from(tx.serialize()).toString('base64');
    },
  },
  waitFor: 'confirmed',
});

console.log(result.signature, result.landed?.slot);
```

## Compatibility

The SDK has **no Solana SDK dependency**. It only exchanges base64-encoded `VersionedTransaction` bytes. That makes it trivially compatible with:

- **`@solana/web3.js`** (classic) — `VersionedTransaction.deserialize` / `.serialize` + `.sign([kp])`
- **`@solana/kit`** (new) — `getTransactionDecoder` / `signTransaction` / `getBase64EncodedWireTransaction`
- **wallet-standard** adapters — wrap the wallet's `signTransaction` into a `SwapSigner`
- **Anything else** that can sign a base64 `VersionedTransaction`

Complete examples for both web3.js and kit: [`examples/05-swap-web3js.ts`](./examples/05-swap-web3js.ts), [`examples/06-swap-kit.ts`](./examples/06-swap-kit.ts).

## Amount helpers

```ts
import { toBaseUnits, fromBaseUnits, fromBaseUnitsString, solToLamports, lamportsToSol } from '@venumdev/sdk';

toBaseUnits(1.5, 9);                   // "1500000000"
toBaseUnits('0.000001', 9);             // "1000"
fromBaseUnitsString('1500000000', 9);   // "1.5"  (exact, no precision loss)
fromBaseUnits('1500000000', 9);         // 1.5    (may lose precision for huge balances)
solToLamports(2.5);                     // "2500000000"
lamportsToSol(1_500_000_000);           // 1.5
```

**Why base-unit strings?** Amounts up to `Number.MAX_SAFE_INTEGER` (2^53) fit in JS `number`, but a wallet with 9M+ SOL at 9 decimals overflows. Strings are lossless. Use `BigInt(raw)` when you need to do math.

## Browser usage

The SDK works in any modern browser — same `fetch`, same streams. But **do not ship an API key to clients.** Set up a backend-for-frontend that proxies requests to [api.venum.dev](https://api.venum.dev), injects the key server-side, and rate-limits per origin/IP. Background and rationale: [venum.dev/solana-free-rpc](https://www.venum.dev/solana-free-rpc).

## License

MIT

---

[www.venum.dev](https://www.venum.dev) &nbsp;·&nbsp; [docs.venum.dev](https://docs.venum.dev) &nbsp;·&nbsp; [API reference](https://docs.venum.dev/api) &nbsp;·&nbsp; [Guides](https://docs.venum.dev/guide) &nbsp;·&nbsp; [Dashboard](https://app.venum.dev) &nbsp;·&nbsp; [CLI](https://github.com/venumhq/solana-venum-cli)
