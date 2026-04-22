// Search + trending + token detail + OHLCV chart.
// Run: VENUM_API_KEY=... tsx examples/02-discovery.ts

import { VenumClient } from '@venumdev/sdk';

const venum = new VenumClient();

const hits = await venum.search('jito', { limit: 5 });
console.log(`Search "jito":`);
hits.results.forEach((r) => console.log(`  [${r.type}] ${r.id} → ${r.href}`));

const trending = await venum.trending({ limit: 5 });
console.log(`\nTop movers (|Δ24h|):`);
trending.movers.forEach((m) => console.log(`  ${m.symbol.padEnd(8)} ${m.change24h?.toFixed(2)}% @ $${m.priceUsd}`));

const jto = await venum.token('JTO', { include: ['market'], topPools: 3 });
console.log(`\nJTO summary: $${jto.summary.priceUsd} across ${jto.summary.poolCount} pools`);
jto.topPools.forEach((p) => console.log(`  - ${p.dex} ${p.address.slice(0, 8)}… TVL $${p.tvlUsd?.toLocaleString() ?? '?'}`));

const candles = await venum.chart('SOL', { range: '1d', interval: '15m' });
console.log(`\nSOL chart: ${candles.candles.length} ${candles.interval} candles from ${candles.pool.dex}`);
