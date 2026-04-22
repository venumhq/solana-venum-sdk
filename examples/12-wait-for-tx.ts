// Resolve at the first matching terminal event for a single signature.
// Run: VENUM_API_KEY=... tsx examples/12-wait-for-tx.ts <signature>

import { VenumClient, VenumStreamClosedError } from '@venumdev/sdk';

const sig = process.argv[2];
if (!sig) {
  console.error('usage: tsx 12-wait-for-tx.ts <signature>');
  process.exit(1);
}

const venum = new VenumClient();

try {
  const landed = await venum.waitForTx(sig, {
    events: ['confirmed'],
    signal: AbortSignal.timeout(30_000),
  });
  console.log(`Status: ${landed.status}, slot: ${landed.slot}`);
  if (landed.err) console.error('Error:', landed.err);
} catch (err) {
  if (err instanceof VenumStreamClosedError) console.error('Stream ended without terminal event');
  else if ((err as Error).name === 'AbortError') console.error('Timed out after 30s');
  else throw err;
}
