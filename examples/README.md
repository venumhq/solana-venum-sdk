# @venumdev/sdk examples

Standalone TypeScript examples for common Venum SDK use cases. Copy-paste into your project, or run in place with `tsx`.

## Setup

From your own project:

```sh
pnpm add @venumdev/sdk
export VENUM_API_KEY=...   # get one at https://www.venum.dev
```

To run any example:

```sh
pnpm dlx tsx examples/01-prices.ts
```

Some examples additionally require:

- `KEYPAIR_PATH` — path to a JSON keypair file (`solana-keygen new`)
- `HELIUS_RPC_URL` — any Helius RPC URL (balance-history server-side walk)
- `@solana/web3.js` (examples 05, 07) — `pnpm add @solana/web3.js`
- `@solana/kit` (example 06) — `pnpm add @solana/kit`

## Index

| File | What it shows |
|---|---|
| [`01-prices.ts`](./01-prices.ts) | Single-token + batch price fetch |
| [`02-discovery.ts`](./02-discovery.ts) | Search, trending, token detail, OHLCV chart |
| [`03-pools.ts`](./03-pools.ts) | Pool discovery by pair, new pools, tradeable mints |
| [`04-quote.ts`](./04-quote.ts) | Quote inspection with route fanout |
| [`05-swap-web3js.ts`](./05-swap-web3js.ts) | Full swap flow using `@solana/web3.js` |
| [`06-swap-kit.ts`](./06-swap-kit.ts) | Full swap flow using `@solana/kit` (new SDK) |
| [`07-swap-helper.ts`](./07-swap-helper.ts) | `venum.swap()` one-shot with a custom signer |
| [`08-stream-prices-callback.ts`](./08-stream-prices-callback.ts) | Live price stream — callback mode |
| [`09-stream-prices-iterator.ts`](./09-stream-prices-iterator.ts) | Live price stream — async iterator mode |
| [`10-stream-pools.ts`](./10-stream-pools.ts) | Live new-pool discovery stream |
| [`11-stream-tx.ts`](./11-stream-tx.ts) | Track up to 10 signatures through landing/confirmation |
| [`12-wait-for-tx.ts`](./12-wait-for-tx.ts) | Await a single signature's terminal event with timeout |
| [`13-balances.ts`](./13-balances.ts) | SPL + Token-2022 + native SOL balances for a wallet |
| [`14-balance-history.ts`](./14-balance-history.ts) | Historical wallet balance points (SSE stream) |
| [`15-trace.ts`](./15-trace.ts) | CPI tree + per-program compute-unit breakdown |
| [`16-error-handling.ts`](./16-error-handling.ts) | Mapping 401/403/429/network errors to UX messages |
| [`17-retry-and-abort.ts`](./17-retry-and-abort.ts) | Custom retry policy, disable retries, `AbortSignal` patterns |
| [`18-amounts.ts`](./18-amounts.ts) | Convert between human decimals and base-unit strings |
| [`19-stream-quote.ts`](./19-stream-quote.ts) | Live quote stream — 2 Hz server recompute, push-on-change |

## Notes

- The SDK itself has **zero runtime dependencies**. Examples that reference `@solana/web3.js` or `@solana/kit` are demonstrating interop — those libs are only needed for local transaction signing.
- All streams accept an `AbortSignal`. Always pair long-running streams with a controller or `AbortSignal.timeout(...)` so they're cancelable.
- The API key is the only credential needed. Do NOT embed it in browser code — proxy through a backend.
