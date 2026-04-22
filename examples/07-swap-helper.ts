// One-shot `venum.swap()` — build + sign + submit + wait in a single call.
// Pass any signer that implements { publicKey, sign(base64) }.
// Run: VENUM_API_KEY=... KEYPAIR_PATH=/path/to/keypair.json tsx examples/07-swap-helper.ts

import { VenumClient, solToLamports, type SwapSigner } from '@venumdev/sdk';
import { Keypair, VersionedTransaction } from '@solana/web3.js';
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';

const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const venum = new VenumClient();
const kp = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(process.env.KEYPAIR_PATH!, 'utf8'))),
);

// Adapt @solana/web3.js keypair to the SwapSigner interface.
const signer: SwapSigner = {
  publicKey: kp.publicKey.toBase58(),
  sign: (unsignedBase64) => {
    const tx = VersionedTransaction.deserialize(Buffer.from(unsignedBase64, 'base64'));
    tx.sign([kp]);
    return Buffer.from(tx.serialize()).toString('base64');
  },
};

const result = await venum.swap({
  inputMint: SOL,
  outputMint: USDC,
  amount: solToLamports(0.01),
  slippageBps: 50,
  signer,
  waitFor: 'confirmed',
});

console.log(`Signature: ${result.signature}`);
console.log(`Route: ${result.build.route.dex}`);
console.log(`Estimated: ${result.build.estimatedOutput}, received slot: ${result.landed?.slot}`);
