// Wallet balances — SPL + Token-2022 + native SOL.
// Run: VENUM_API_KEY=... tsx examples/13-balances.ts <walletAddress>

import { VenumClient } from '@venumdev/sdk';

const wallet = process.argv[2];
if (!wallet) {
  console.error('usage: tsx 13-balances.ts <walletAddress>');
  process.exit(1);
}

const venum = new VenumClient();
const bals = await venum.balances(wallet);

console.log(`${bals.balances.length} balances for ${wallet.slice(0, 8)}…`);
for (const b of bals.balances) {
  if (b.uiAmount && b.uiAmount > 0) {
    console.log(`  ${b.symbol.padEnd(10)} ${b.uiAmount}  (${b.mint.slice(0, 8)}…)`);
  }
}
