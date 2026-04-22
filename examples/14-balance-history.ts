// Historical SOL balance points streamed as the server walks back through signatures.
// Requires a Helius RPC URL (free-tier is fine for historical reads).
// Run: VENUM_API_KEY=... HELIUS_RPC_URL=... tsx examples/14-balance-history.ts <wallet>

import { VenumClient } from '@venumdev/sdk';

const wallet = process.argv[2];
if (!wallet) {
  console.error('usage: tsx 14-balance-history.ts <walletAddress>');
  process.exit(1);
}

const venum = new VenumClient();

for await (const msg of venum.iterateBalanceHistory({
  walletAddress: wallet,
  heliusRpcUrl: process.env.HELIUS_RPC_URL!,
})) {
  if (msg.type === 'points') {
    for (const pt of msg.points) {
      console.log(`${new Date(pt.blockTime * 1000).toISOString()}  SOL=${pt.sol}  slot=${pt.slot}`);
    }
  } else if (msg.type === 'complete') {
    console.log(`\nDone. ${msg.result.stats.points} points in ${msg.result.stats.elapsedMs}ms`);
    break;
  } else if (msg.type === 'error') {
    console.error('error:', msg.error, msg.details);
    break;
  }
}
