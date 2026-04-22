// Full swap flow with @solana/web3.js (classic).
// Run: VENUM_API_KEY=... KEYPAIR_PATH=/path/to/keypair.json tsx examples/05-swap-web3js.ts

import { VenumClient, solToLamports } from '@venumdev/sdk';
import { Keypair, VersionedTransaction } from '@solana/web3.js';
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';

const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const venum = new VenumClient();
const wallet = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(process.env.KEYPAIR_PATH!, 'utf8'))),
);

// 1. Build unsigned transaction
const build = await venum.buildSwap({
  inputMint: SOL,
  outputMint: USDC,
  amount: solToLamports(0.01),
  userPublicKey: wallet.publicKey.toBase58(),
  slippageBps: 50,
});
console.log(`Built: ${build.route.dex}, ~${build.estimatedOutput} USDC base units, quote ${build.quoteId}`);

// 2. Deserialize, sign, re-serialize
const tx = VersionedTransaction.deserialize(Buffer.from(build.transaction, 'base64'));
tx.sign([wallet]);
const signedBase64 = Buffer.from(tx.serialize()).toString('base64');

// 3. Submit
const submit = await venum.submitSwap({ quoteId: build.quoteId, signedTransaction: signedBase64 });
console.log(`Submitted: ${submit.signature}  jito=${submit.jito}  rpc=${submit.rpc}`);

// 4. Wait for confirmation
const landed = await venum.waitForTx(submit.signature, { events: ['confirmed'] });
console.log(`Landed at slot ${landed.slot}, status ${landed.status}`);
