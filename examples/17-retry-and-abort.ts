// Fine-tune retry behavior + cancellation.
// Run: VENUM_API_KEY=... tsx examples/17-retry-and-abort.ts

import { VenumClient } from '@venumdev/sdk';

// (1) Custom retry policy (same keys override defaults)
const venum = new VenumClient({
  retry: { retries: 5, baseDelayMs: 200, maxDelayMs: 10_000, retryOn: [429, 502, 503, 504] },
});

// (2) Disable retries for a single request
await venum.pools({ token: 'SOL' }, { retry: false });

// (3) Disable retries globally (you handle them)
const rawVenum = new VenumClient({ retry: false });
void rawVenum;

// (4) AbortSignal.timeout cancels the in-flight request AND any pending retry
try {
  const quote = await venum.quote(
    { inputMint: 'SOL', outputMint: 'USDC', amount: '1000000' },
    { signal: AbortSignal.timeout(1500) },
  );
  console.log('got quote:', quote.topRoutes.length, 'routes');
} catch (err) {
  if ((err as Error).name === 'AbortError') console.error('cancelled: exceeded 1.5s budget');
  else throw err;
}

// (5) Manual AbortController (for user-triggered cancels)
const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 5_000);
await venum.streamPrices(['SOL'], {
  signal: ctrl.signal,
  onEvent: (m) => m.type === 'price' && console.log(m.price.priceUsd),
});
