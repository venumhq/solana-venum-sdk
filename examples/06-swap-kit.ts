// Full swap flow with @solana/kit (the new SDK).
// Run: VENUM_API_KEY=... KEYPAIR_PATH=/path/to/keypair.json tsx examples/06-swap-kit.ts
//
// The SDK's wire format is base64-encoded VersionedTransaction — the same
// across @solana/web3.js and @solana/kit. The only thing that differs is
// how you decode, sign, and re-encode the bytes.

import { VenumClient, solToLamports } from '@venumdev/sdk';
import {
  createKeyPairSignerFromBytes,
  getBase64EncodedWireTransaction,
  getTransactionDecoder,
  signTransaction,
} from '@solana/kit';
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';

const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const venum = new VenumClient();
const secret = Uint8Array.from(JSON.parse(readFileSync(process.env.KEYPAIR_PATH!, 'utf8')));
const signer = await createKeyPairSignerFromBytes(secret);

const build = await venum.buildSwap({
  inputMint: SOL,
  outputMint: USDC,
  amount: solToLamports(0.01),
  userPublicKey: signer.address,    // Address is a base58 branded string
  slippageBps: 50,
});

// Decode → sign → re-encode as base64 wire format
const unsigned = getTransactionDecoder().decode(Buffer.from(build.transaction, 'base64'));
const signed = await signTransaction([signer.keyPair], unsigned);
const signedBase64 = getBase64EncodedWireTransaction(signed);

const submit = await venum.submitSwap({ quoteId: build.quoteId, signedTransaction: signedBase64 });
const landed = await venum.waitForTx(submit.signature, { events: ['confirmed'] });
console.log(`Landed ${submit.signature} at slot ${landed.slot}`);
