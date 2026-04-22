// Live price stream — async iterator mode. Use `break` to stop.
// Run: VENUM_API_KEY=... tsx examples/09-stream-prices-iterator.ts

import { VenumClient } from '@venumdev/sdk';

const venum = new VenumClient();
const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 15_000);

let n = 0;
for await (const msg of venum.iteratePrices(['SOL', 'USDC'], { signal: ctrl.signal })) {
  if (msg.type !== 'price') continue;
  console.log(`${msg.price.token} $${msg.price.priceUsd}`);
  if (++n >= 50) break;
}
