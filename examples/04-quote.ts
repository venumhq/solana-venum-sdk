// Get a quote and inspect the routed DEX + price impact.
// Run: VENUM_API_KEY=... tsx examples/04-quote.ts

import { VenumClient, solToLamports } from '@venumdev/sdk';

const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const venum = new VenumClient();

const quote = await venum.quote({
  inputMint: SOL,
  outputMint: USDC,
  amount: solToLamports(1),  // 1 SOL
  slippageBps: 50,            // 0.5%
});

console.log(`Input: 1 SOL → Output options:`);
quote.topRoutes.slice(0, 5).forEach((r, i) => {
  const multi = r.hops?.length ? ` (${r.hops.length}-hop)` : '';
  console.log(`  #${i + 1} ${r.dex}${multi}  out: ${r.outputAmount}  impact: ${r.priceImpactPct?.toFixed(4) ?? '?'}%  cache: ${r.poolCacheAgeMs}ms`);
});
