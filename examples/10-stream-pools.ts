// Live stream of newly discovered pools. Requires a starter-tier key or above.
// Run: VENUM_API_KEY=... tsx examples/10-stream-pools.ts

import { VenumClient } from '@venumdev/sdk';

const venum = new VenumClient();

for await (const msg of venum.iteratePools({ reconnectDelayMs: 3000 })) {
  if (msg.type === 'new-pool') {
    console.log(`${new Date(msg.pool.discoveredAt).toISOString()}  ${msg.pool.dex}  ${msg.pool.address}`);
  }
}
