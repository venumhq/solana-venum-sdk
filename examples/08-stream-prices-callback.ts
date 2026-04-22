// Live price stream — callback mode. Cancellable via AbortSignal.
// Run: VENUM_API_KEY=... tsx examples/08-stream-prices-callback.ts

import { VenumClient } from '@venumdev/sdk';

const venum = new VenumClient();
const ctrl = new AbortController();

setTimeout(() => ctrl.abort(), 15_000);  // stop after 15s

await venum.streamPrices(['SOL', 'JITOSOL', 'BONK'], {
  signal: ctrl.signal,
  onError: (msg) => console.warn('reconnecting:', msg),
  onEvent: (msg) => {
    switch (msg.type) {
      case 'ready':
        console.log(`stream ready @ ${new Date(msg.ts).toISOString()}`);
        break;
      case 'price':
        console.log(`${msg.price.token.padEnd(8)} $${msg.price.priceUsd}  age=${msg.price.poolCacheAgeMs}ms`);
        break;
      case 'heartbeat':
        break;
    }
  },
});

console.log('stream closed');
