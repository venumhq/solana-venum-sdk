// Follow up to 10 transaction signatures through landing / processing / confirmation.
// Run: VENUM_API_KEY=... tsx examples/11-stream-tx.ts sig1 sig2 sig3

import { VenumClient } from '@venumdev/sdk';

const signatures = process.argv.slice(2);
if (signatures.length === 0) {
  console.error('usage: tsx 11-stream-tx.ts <signature> [signature...]');
  process.exit(1);
}

const venum = new VenumClient();

for await (const msg of venum.iterateTx(signatures, { events: ['landed', 'processed', 'confirmed'] })) {
  if (msg.type === 'tx') {
    console.log(`${msg.tx.signature.slice(0, 8)}… ${msg.tx.status.padEnd(10)} slot=${msg.tx.slot}`);
  } else if (msg.type === 'error') {
    console.error(`error on ${msg.signature.slice(0, 8)}…: ${msg.reason}`);
  }
}
