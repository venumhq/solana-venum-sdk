// Pool discovery: by pair, newest discoveries, pairs tradeable against a mint.
// Run: VENUM_API_KEY=... tsx examples/03-pools.ts

import { VenumClient } from '@venumdev/sdk';

const venum = new VenumClient();

const solUsdc = await venum.pools({ pair: ['SOL', 'USDC'], limit: 5 });
console.log(`SOL/USDC pools (${solUsdc.count} of ${solUsdc.total}):`);
solUsdc.pools.forEach((p) => console.log(`  ${p.dex.padEnd(18)} ${p.address.slice(0, 10)}… TVL $${p.tvlUsd?.toLocaleString() ?? '?'}`));

const fresh = await venum.newPools({ limit: 10 });
console.log(`\nNew pools in the last window:`);
fresh.pools.forEach((p) => console.log(`  ${new Date(p.discoveredAt).toISOString()}  ${p.dex}  ${p.symbolA ?? p.mintA.slice(0, 6)}/${p.symbolB ?? p.mintB.slice(0, 6)}`));

const pairs = await venum.pairs('SOL');
console.log(`\nSOL trades against ${pairs.count} mints. Top 10 by pool count:`);
pairs.pairs.slice(0, 10).forEach((p) => console.log(`  ${p.symbol.padEnd(8)} ${p.poolCount} pools`));
