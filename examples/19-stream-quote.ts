// Live quote stream — server recomputes at 2 Hz and pushes a new event only
// when `bestRoute.outputAmount` moves past `minMoveBps` (default 1).
// Route may change between emissions.
// Run: VENUM_API_KEY=... tsx examples/19-stream-quote.ts

import { VenumClient } from '@venumdev/sdk';

const venum = new VenumClient();
const ctrl = new AbortController();

setTimeout(() => ctrl.abort(), 15_000);  // stop after 15s

await venum.streamQuote(
  {
    inputMint: 'SOL',
    outputMint: 'USDC',
    amount: '1000000000',   // 1 SOL (9 decimals)
    slippageBps: 100,
    tickHz: 2,
    minMoveBps: 1,
  },
  {
    signal: ctrl.signal,
    onError: (msg) => console.warn('stream error:', msg),
    onEvent: (msg) => {
      switch (msg.type) {
        case 'quote': {
          const best = msg.quote.bestRoute;
          console.log(`${best.dex.padEnd(20)} out=${best.outputAmount} age=${best.poolCacheAgeMs}ms`);
          break;
        }
        case 'error':
          console.error(`stream error event: ${msg.payload.error} (status ${msg.payload.status})`);
          break;
        case 'heartbeat':
          break;
      }
    },
  },
);

console.log('stream closed');
