// Map API errors to actionable UX messages.
// Run: VENUM_API_KEY=bad tsx examples/16-error-handling.ts

import { VenumClient, VenumApiError, VenumNetworkError } from '@venumdev/sdk';

const venum = new VenumClient();

async function safeQuote() {
  try {
    return await venum.quote({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: '1000000000',
    });
  } catch (err) {
    if (err instanceof VenumApiError) {
      if (err.status === 401) {
        console.error('Missing or invalid API key. Get one at https://www.venum.dev.');
      } else if (err.status === 403) {
        console.error('Your plan does not include this endpoint. Upgrade at https://www.venum.dev/pricing.');
      } else if (err.status === 429) {
        console.error('Rate limit exceeded. Upgrade your plan or wait before retrying.');
      } else if (err.status === 404) {
        console.error('No route found for this pair.');
      } else {
        console.error(`API error ${err.status}: ${err.body.slice(0, 200)}`);
      }
    } else if (err instanceof VenumNetworkError) {
      console.error(`Could not reach ${err.url}:`, err.cause);
    } else if ((err as Error).name === 'AbortError') {
      console.error('Cancelled');
    } else {
      throw err;
    }
    return null;
  }
}

const result = await safeQuote();
if (result) console.log(`best: ${result.topRoutes[0]?.dex}`);
