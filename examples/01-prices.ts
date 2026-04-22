// Fetch a single token price and a batch of prices.
// Run: VENUM_API_KEY=... tsx examples/01-prices.ts

import { VenumClient } from '@venumdev/sdk';

const venum = new VenumClient();

const sol = await venum.price('SOL');
console.log(`SOL: $${sol.priceUsd.toFixed(4)} | bid ${sol.bestBidDex} / ask ${sol.bestAskDex} | age ${sol.poolCacheAgeMs}ms`);

const batch = await venum.prices(['SOL', 'USDC', 'BONK', 'JITOSOL', 'WBTC']);
for (const [symbol, entry] of Object.entries(batch.prices)) {
  if ('priceUsd' in entry) console.log(`${symbol.padEnd(8)} $${entry.priceUsd}`);
  else console.log(`${symbol.padEnd(8)} unavailable (${entry.reason})`);
}
